import { DataFrame } from "../dataframe/dataframe"
import { DataTypeRegistry, type RegisteredDataType } from "../datatypes"
import { isTypedArray } from "../utils"
import type { ColumnDict, ConcatOptions, RowRecord, DataFrameSchema } from "../types"
import { DataFrameError, SchemaError, ShapeError } from "../exceptions"

function _copyElements(src: ArrayLike<unknown>, dest: ArrayLike<unknown> | unknown[], offset: number, count: number): void {
    if (isTypedArray(src) && isTypedArray(dest)) {
        (dest as Uint8Array).set(src as ArrayLike<number>, offset);
        return;
    }
    const destArr = dest as unknown[];
    for (let i = 0; i < count; i++) {
        destArr[offset + i] = src[i];
    }
}

function _blitStackedColumns<U extends RowRecord>(
    items: DataFrame<RowRecord>[],
    columns: string[],
    outSchema: DataFrameSchema,
    totalHeight: number,
    allowTyped: boolean = false
): DataFrame<U> {
    const newColumns: Record<string, ArrayLike<unknown>> = {};

    for (let c = 0; c < columns.length; c++) {
        const key = columns[c];
        const type = outSchema[key];
        let allTyped = Boolean(allowTyped && type);
        if (allTyped) {
            for (let i = 0; i < items.length; i++) {
                if (!isTypedArray(items[i]._columns[key])) {
                    allTyped = false;
                    break;
                }
            }
        }
        newColumns[key] = allTyped ? type!.allocate(totalHeight) : new Array(totalHeight).fill(null);
    }

    let offset = 0;
    for (let i = 0; i < items.length; i++) {
        const df = items[i];
        const h = df.height;
        if (h === 0) continue;

        for (let c = 0; c < columns.length; c++) {
            const key = columns[c];
            const src = df._columns[key];
            if (src !== undefined) {
                _copyElements(src, newColumns[key], offset, h);
            }
        }
        offset += h;
    }

    return DataFrame._createDirect<U>(newColumns as ColumnDict, outSchema, totalHeight);
}

/**
 * Concatenates items vertically, horizontally, or diagonally.
 * @namespace $df
 * @syntax $df.{symbol}(...)
 * @param rawItems Single DataFrame or array of DataFrames/rows to concatenate.
 * @param [options] Configuration options for concatenation layout and strictness.
 * @returns DataFrame
 * 
 * @example
 * // 1. Vertical Concatenation (default):
 * <!-- doc:base_concat_pair -->
 * $df.concat([df1, df2], { how: "vertical" });
 * // shape: (4, 1)
 * // +------+
 * // | a    |
 * // +------+
 * // | 1    |
 * // | 2    |
 * // | null |
 * // | null |
 * // +------+
 * 
 * @example
 * // 2. Horizontal Concatenation:
 * <!-- doc:base_concat_pair -->
 * const dfB = $df.dataFrame({ b: [10, 20] });
 * $df.concat([df1, dfB], { how: "horizontal" });
 * // shape: (2, 2)
 * // +---+----+
 * // | a | b  |
 * // +---+----+
 * // | 1 | 10 |
 * // | 2 | 20 |
 * // +---+----+
 * 
 * @example
 * // 3. Diagonal Concatenation (mismatched columns):
 * <!-- doc:base_concat_pair -->
 * $df.concat([df1, df2], { how: "diagonal" });
 * // shape: (4, 2)
 * // +------+------+
 * // | a    | b    |
 * // +------+------+
 * // | 1    | null |
 * // | 2    | null |
 * // | null | 10   |
 * // | null | 20   |
 * // +------+------+
 */
export function concat<U extends RowRecord = RowRecord>(
    rawItems: DataFrame | DataFrame[],
    { how = 'vertical', horizontal }: ConcatOptions = {}
): DataFrame<U> {
    if (rawItems == null) {
        throw new DataFrameError("Invalid input to concat: rawItems cannot be null or undefined.");
    }
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    for (let i = 0, len = items.length; i < len; i++) {
        if (!(items[i] instanceof DataFrame)) {
            throw new DataFrameError(`Invalid input to concat at index ${i}: expected DataFrame.`);
        }
    }

    if (items.length === 0) return DataFrame._createDirect<U>({}, {}, 0);
    if (items.length === 1 && how !== 'horizontal') return items[0] as DataFrame<U>;

    switch (how) {
        case 'vertical': {
            let firstDF: DataFrame<RowRecord> | null = null;
            let totalHeight = 0;
            for (let i = 0; i < items.length; i++) {
                totalHeight += items[i].height;
                if (!firstDF && items[i].height > 0) firstDF = items[i];
            }
            if (!firstDF) return DataFrame._createDirect<U>({}, {}, 0);

            const firstKeys = Object.keys(firstDF._columns);

            for (let i = 0; i < items.length; i++) {
                const df = items[i];
                if (df.height === 0) continue;

                const keys = Object.keys(df._columns);
                if (firstKeys.length !== keys.length) {
                    throw new DataFrameError(`[Strict Vertical] Column count mismatch at index ${i}`);
                }
                for (let j = 0; j < firstKeys.length; j++) {
                    const key = firstKeys[j];
                    if (key !== keys[j]) {
                        throw new DataFrameError(`[Strict Vertical] Schema mismatch at ${j} in DF ${i}: expected "${key}", found "${keys[j]}"`);
                    }
                    const typeA = firstDF.schema[key];
                    const typeB = df.schema[key];
                    if (typeA && typeB && !typeA.equals(typeB)) {
                        throw new SchemaError(`Schema type mismatch for column "${key}": expected ${typeA.name}, found ${typeB.name}`);
                    }
                }
            }

            return _blitStackedColumns<U>(items, firstKeys, firstDF.schema, totalHeight, true);
        }

        case 'horizontal': {
            const strict = horizontal?.strict ?? true;
            let maxHeight = 0;
            for (let i = 0; i < items.length; i++) {
                if (items[i].height > maxHeight) maxHeight = items[i].height;
            }

            const allColNames = new Set<string>();
            const newColumns: Record<string, ArrayLike<unknown>> = {};
            const outSchema: DataFrameSchema = {};

            for (let i = 0; i < items.length; i++) {
                const df = items[i];
                const h = df.height;
                if (strict && h !== maxHeight) {
                    throw new ShapeError(`[Horizontal] Row count mismatch at index ${i}: expected ${maxHeight}, got ${h}`);
                }
                Object.assign(outSchema, df.schema);

                const keys = Object.keys(df._columns);
                for (let k = 0; k < keys.length; k++) {
                    const key = keys[k];
                    if (allColNames.has(key)) {
                        throw new DataFrameError(`[Horizontal] Duplicate column name "${key}"`);
                    }
                    allColNames.add(key);

                    const col = df._columns[key];
                    if (h === maxHeight) {
                        newColumns[key] = isTypedArray(col) ? Array.from(col as Iterable<unknown> | ArrayLike<unknown>) : col;
                    } else {
                        const padded = new Array(maxHeight).fill(null);
                        _copyElements(col, padded, 0, h);
                        newColumns[key] = padded;
                    }
                }
            }

            return DataFrame._createDirect<U>(newColumns as ColumnDict, outSchema, maxHeight);
        }

        case 'diagonal': {
            const allColumnsSet = new Set<string>();
            let totalHeight = 0;
            for (let i = 0; i < items.length; i++) {
                totalHeight += items[i].height;
                for (const key of Object.keys(items[i]._columns)) {
                    allColumnsSet.add(key);
                }
            }

            const allColumns = Array.from(allColumnsSet);
            const outSchema: DataFrameSchema = {};

            for (let c = 0; c < allColumns.length; c++) {
                const key = allColumns[c];
                let colType: RegisteredDataType | null = null;
                for (let i = 0; i < items.length; i++) {
                    const itemType = items[i].schema[key];
                    if (itemType) {
                        if (colType === null) {
                            colType = itemType;
                        } else if (!colType.equals(itemType)) {
                            throw new SchemaError(`Schema type mismatch for column "${key}": expected ${colType.name}, found ${itemType.name}`);
                        }
                    }
                }
                outSchema[key] = colType || DataTypeRegistry.Utf8;
            }

            return _blitStackedColumns<U>(items, allColumns, outSchema, totalHeight, false);
        }
    }
}