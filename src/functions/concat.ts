import { DataFrame } from "../dataframe/dataframe"
import { DataType, DataTypeRegistry } from "../datatypes"
import { isTypedArray, isPlainObj, isArrayOfType, isArrayOrTypedArray } from "../utils"
import type { ColumnDict, ConcatOptions, ConcatItem, RowRecord, DataFrameSchema } from "../types"
import { DataFrameError, SchemaError } from "../exceptions"
export function normalizeToDataFrames(item: any, context: string, index: number): DataFrame<any>[] {
    if (item == null) {
        throw new DataFrameError(`Invalid input to ${context} at index ${index}: item cannot be null or undefined.`);
    }
    if (item instanceof DataFrame) {
        return [item];
    }

    if (isPlainObj(item)) {
        return [new DataFrame(item as ColumnDict)];
    }

    if (isArrayOrTypedArray(item)) {
        if (isArrayOfType(item, DataFrame, { mode: "every" })) {
            return item as DataFrame<any>[];
        }
        if (isArrayOfType(item, "plainObject", { mode: "every" })) {
            return [new DataFrame(item as any[])];
        }
        const anyDF = isArrayOfType(item, DataFrame, { mode: "some" });
        for (let j = 0; j < item.length; j++) {
            if (anyDF ? !(item[j] instanceof DataFrame) : !isPlainObj(item[j])) {
                throw new DataFrameError(anyDF
                    ? `Invalid input to ${context} at index ${index}, sub-index ${j}: nested array must contain only DataFrame instances.`
                    : `Invalid input to ${context} at index ${index}, row ${j}: rows must be plain objects.`
                );
            }
        }
    }

    throw new DataFrameError(`Invalid input to ${context} at index ${index}: expected DataFrame, row array, or column dictionary.`);
}

export function concat<U extends RowRecord = any>(
    rawItems: ConcatItem | ConcatItem[],
    options: ConcatOptions = {}
): DataFrame<U> {
    if (rawItems == null) {
        throw new DataFrameError("Invalid input to concat: rawItems cannot be null or undefined.");
    }
    const itemsArray = Array.isArray(rawItems) ? rawItems : [rawItems];
    const items: DataFrame<any>[] = [];
    for (let i = 0; i < itemsArray.length; i++) {
        items.push(...normalizeToDataFrames(itemsArray[i], "concat", i));
    }

    const { how = 'vertical' } = options;
    const strict = options.horizontal?.strict ?? true;

    if (items.length === 0) return new DataFrame<U>({}, {}, 0);
    if (items.length === 1 && how !== 'horizontal') return items[0] as DataFrame<U>;

    switch (how) {
        case 'vertical': {
            const validItems: DataFrame<any>[] = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].height > 0) {
                    validItems.push(items[i]);
                }
            }
            if (validItems.length === 0) return new DataFrame<U>({}, {}, 0);

            const firstDF = validItems[0];
            const firstKeys = Object.keys(firstDF._columns);

            for (let i = 0; i < items.length; i++) {
                const currentDF = items[i];
                if (currentDF.height === 0) continue;

                const currentKeys = Object.keys(currentDF._columns);

                if (firstKeys.length !== currentKeys.length) {
                    throw new DataFrameError(`[Strict Vertical] Column count mismatch at index ${i}.`);
                }
                for (let j = 0; j < firstKeys.length; j++) {
                    if (firstKeys[j] !== currentKeys[j]) {
                        throw new DataFrameError(
                            `[Strict Vertical] Schema mismatch at position ${j} in DF ${i}. ` +
                            `Expected column "${firstKeys[j]}", but found "${currentKeys[j]}".`
                        );
                    }
                    const typeA = firstDF.schema[firstKeys[j]];
                    const typeB = currentDF.schema[firstKeys[j]];
                    if (typeA && typeB && !typeA.equals(typeB)) {
                        throw new SchemaError(`[Strict Type Check] Schema type mismatch for column "${firstKeys[j]}": expected ${typeA.name}, found ${typeB.name}.`);
                    }
                }
            }

            let newHeight = 0;
            for (const item of items) {
                newHeight += item.height;
            }

            const outSchema = items.find(df => df.height > 0)?.schema || items[0]?.schema || {};
            const newColumns: Record<string, ArrayLike<any>> = {};

            for (const key of firstKeys) {
                const type = outSchema[key];
                let hasNulls = false;
                for (const item of items) {
                    const colArr = item._columns[key];
                    if (!colArr) {
                        hasNulls = true;
                        break;
                    }
                    if (!isTypedArray(colArr)) {
                        for (let i = 0; i < colArr.length; i++) {
                            if (colArr[i] == null) {
                                hasNulls = true;
                                break;
                            }
                        }
                    }
                    if (hasNulls) break;
                }

                let dest = type && type.allocate ? type.allocate(newHeight) : new Array(newHeight).fill(null);
                if (hasNulls && isTypedArray(dest)) {
                    dest = new Array(newHeight).fill(null);
                }
                newColumns[key] = dest;
            }

            let offset = 0;
            for (const item of items) {
                const h = item.height;
                if (h === 0) continue;
                for (const key of firstKeys) {
                    const colArr = item._columns[key] || new Array(h).fill(null);
                    const dest = newColumns[key];
                    if (isTypedArray(dest) && isTypedArray(colArr)) {
                        (dest as Uint8Array).set(colArr as ArrayLike<number>, offset);
                    } else {
                        const destArr = dest as any[];
                        for (let i = 0; i < h; i++) {
                            destArr[offset + i] = colArr[i];
                        }
                    }
                }
                offset += h;
            }
            return new DataFrame<U>(newColumns as ColumnDict, outSchema, newHeight);
        }

        case 'horizontal': {
            let maxHeight = items[0].height;
            for (let i = 1; i < items.length; i++) {
                if (items[i].height > maxHeight) {
                    maxHeight = items[i].height;
                }
            }

            const allColNames = new Set<string>();

            for (let idx = 0; idx < items.length; idx++) {
                const df = items[idx];
                if (strict && df.height !== maxHeight) {
                    throw new DataFrameError(`[Horizontal] Row count mismatch at index ${idx}. Expected ${maxHeight}, got ${df.height}. Set strict=false to allow padding.`);
                }

                for (const key of Object.keys(df._columns)) {
                    if (allColNames.has(key)) {
                        throw new DataFrameError(`[Horizontal] Duplicate column name "${key}" detected. Horizontal concat requires unique names.`);
                    }
                    allColNames.add(key);
                }
            }

            const newColumns: Record<string, ArrayLike<any>> = {};
            const outSchema: DataFrameSchema = {};

            for (const df of items) {
                const h = df.height;
                Object.assign(outSchema, df.schema);

                for (const [key, col] of Object.entries(df._columns)) {
                    if (h === maxHeight) {
                        newColumns[key] = isTypedArray(col) ? Array.from(col) : col;
                    } else {
                        const padded = new Array(maxHeight);
                        for (let i = 0; i < h; i++) {
                            padded[i] = col[i];
                        }
                        for (let i = h; i < maxHeight; i++) {
                            padded[i] = null;
                        }
                        newColumns[key] = padded;
                    }
                }
            }

            return new DataFrame<U>(newColumns as ColumnDict, outSchema, maxHeight);
        }

        case 'diagonal': {
            const allColumnsSet = new Set<string>();
            for (const df of items) {
                for (const key of Object.keys(df._columns)) {
                    allColumnsSet.add(key);
                }
            }

            const allColumns = Array.from(allColumnsSet);
            let newHeight = 0;
            for (let i = 0; i < items.length; i++) {
                newHeight += items[i].height;
            }

            const outSchema: DataFrameSchema = {};
            for (const key of allColumns) {
                let colType: DataType | null = null;
                for (const item of items) {
                    const itemType = item.schema[key];
                    if (itemType) {
                        if (colType === null) {
                            colType = itemType;
                        } else {
                            if (!colType.equals(itemType)) {
                                throw new SchemaError(`[Strict Type Check] Schema type mismatch for column "${key}": expected ${colType.name}, found ${itemType.name}.`);
                            }
                        }
                    }
                }
                outSchema[key] = colType || DataTypeRegistry.Utf8;
            }

            const newColumns: Record<string, ArrayLike<any>> = {};
            for (let j = 0; j < allColumns.length; j++) {
                newColumns[allColumns[j]] = new Array(newHeight).fill(null);
            }

            let offset = 0;
            for (let i = 0; i < items.length; i++) {
                const df = items[i];
                const h = df.height;
                if (h === 0) continue;
                for (let j = 0; j < allColumns.length; j++) {
                    const col = allColumns[j];
                    const dest = newColumns[col];
                    const src = df._columns[col];
                    if (src !== undefined) {
                        if (isTypedArray(src) && isTypedArray(dest)) {
                            (dest as Uint8Array).set(src as ArrayLike<number>, offset);
                        } else {
                            const destArr = dest as any[];
                            for (let k = 0; k < h; k++) {
                                destArr[offset + k] = src[k];
                            }
                        }
                    } else {
                        const destArr = dest as any[];
                        for (let k = 0; k < h; k++) {
                            destArr[offset + k] = null;
                        }
                    }
                }
                offset += h;
            }

            return new DataFrame<U>(newColumns as ColumnDict, outSchema, newHeight);
        }
    }
}
