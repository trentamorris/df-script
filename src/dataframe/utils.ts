/** @internalfile */
import type { IExpr, ColumnData, ColumnDict, RegisteredDataType } from "../types"
import { DataTypeRegistry } from "../datatypes"
import { KEY_SEPARATOR } from "./constants"
import { isObj, isTypedArray, toCanonicalString, isArrayOrTypedArray, isValidDateObj } from "../utils"
import { assertColumnExists } from "../exceptions"

function partition_by_columns(
    columns: ColumnDict,
    height: number,
    partitionKeys: (string | IExpr)[]
): Map<string, number[]> {
    const partitionMap = new Map<string, number[]>();

    const pKeysLen = partitionKeys.length;
    const keyColumns = new Array(pKeysLen);
    for (let i = 0; i < pKeysLen; i++) {
        const pKey = partitionKeys[i];
        if (typeof pKey === "string") {
            assertColumnExists(pKey, columns, "Partition key", " in the DataFrame.");
            keyColumns[i] = columns[pKey];
        } else {
            keyColumns[i] = pKey.evaluate(columns, height);
        }
    }

    if (pKeysLen === 1) {
        const keyCol = keyColumns[0];
        for (let i = 0; i < height; i++) {
            const val = keyCol[i];
            const hash = val == null ? "" : toCanonicalString(val);
            let group = partitionMap.get(hash);
            if (group === undefined) {
                group = [];
                partitionMap.set(hash, group);
            }
            group.push(i);
        }
        return partitionMap;
    }

    for (let i = 0; i < height; i++) {
        const keyValues = new Array(pKeysLen);
        for (let j = 0; j < pKeysLen; j++) {
            const val = keyColumns[j][i];
            keyValues[j] = val == null ? "" : toCanonicalString(val);
        }
        const hash = keyValues.join(KEY_SEPARATOR);
        let group = partitionMap.get(hash);
        if (group === undefined) {
            group = [];
            partitionMap.set(hash, group);
        }
        group.push(i);
    }
    return partitionMap;
}

export function resolveWindowExpr(expr: IExpr, columns: ColumnDict, height: number): ColumnData {
    const results = new Array(height);
    if (height === 0) return results;

    const partitionKeys = expr._partitionBy || [];
    const partitionGroups = partition_by_columns(columns, height, partitionKeys);

    const prePartitionArray = expr._evaluatePre(expr._partitionOpsIndex, columns, height);

    for (const indices of partitionGroups.values()) {
        const groupLen = indices.length;
        const groupPreValues = new Array(groupLen);
        for (let k = 0; k < groupLen; k++) {
            groupPreValues[k] = prePartitionArray[indices[k]];
        }

        if (expr._evaluateWindow) {
            for (let k = 0; k < groupLen; k++) {
                results[indices[k]] = expr._evaluateWindow(groupPreValues, indices, k);
            }
            continue;
        }

        if (expr._aggFn) {
            const aggregatedVal = expr._aggFn(groupPreValues);
            for (let k = 0; k < groupLen; k++) {
                results[indices[k]] = aggregatedVal;
            }
            continue;
        }

        for (let k = 0; k < groupLen; k++) {
            results[indices[k]] = prePartitionArray[indices[k]];
        }
    }

    return expr._evaluatePost(expr._partitionOpsIndex, results, columns);
}

export function rowsToColumns(rows: any[]): { columns: ColumnDict; height: number } {
    if (!Array.isArray(rows) || rows.length === 0) {
        return { columns: {}, height: 0 };
    }
    const height = rows.length;
    const keysSet = new Set<string>();
    for (let r = 0; r < height; r++) {
        const row = rows[r];
        if (isObj(row)) {
            const rowKeys = Object.keys(row);
            for (let i = 0; i < rowKeys.length; i++) {
                keysSet.add(rowKeys[i]);
            }
        }
    }
    const keys = Array.from(keysSet);
    const columns: Record<string, any[]> = {};
    for (let i = 0; i < keys.length; i++) {
        columns[keys[i]] = new Array(height);
    }
    for (let r = 0; r < height; r++) {
        const row = rows[r] || {};
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const val = row[k];
            columns[k][r] = val === undefined ? null : val;
        }
    }
    return { columns, height };
}

export function columnsToRows(columns: ColumnDict, height: number): any[] {
    const keys = Object.keys(columns);
    const rows = new Array(height);
    for (let r = 0; r < height; r++) {
        const row: any = {};
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const val = columns[k][r];
            row[k] = val === undefined ? null : val;
        }
        rows[r] = row;
    }
    return rows;
}

export function getRowFromColumns(columns: ColumnDict, idx: number, keys: string[]): any {
    const row: any = {};
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const val = columns[k][idx];
        row[k] = val === undefined ? null : val;
    }
    return row;
}

export function inferColumnType(col: ColumnData): RegisteredDataType {
    if (col.length === 0) return DataTypeRegistry.Utf8;
    let isBoolean = true;
    let isInteger = true;
    let isNumeric = true;
    let isBigInt = true;
    let isDate = true;
    let isArrayVal = true;
    let isBinary = true;
    let isObject = true;
    let hasDateObj = false;
    let hasNonNull = false;
    const allArrayElements: any[] = [];

    for (let i = 0; i < col.length; i++) {
        const val = col[i];
        if (val == null) continue;
        hasNonNull = true;

        if (!(val instanceof Uint8Array)) {
            isBinary = false;
        }

        if (!isArrayOrTypedArray(val) || val instanceof Uint8Array) {
            isArrayVal = false;
        } else {
            const valArr = val as any;
            const subLen = valArr.length;
            for (let j = 0; j < subLen; j++) {
                allArrayElements.push(valArr[j]);
            }
        }
        if (isValidDateObj(val)) hasDateObj = true;
        if (typeof val !== "boolean") isBoolean = false;
        if (typeof val !== "bigint") isBigInt = false;
        if (typeof val !== "number") {
            isNumeric = false;
            isInteger = false;
        } else {
            if (!Number.isInteger(val)) isInteger = false;
        }
        if (!isValidDateObj(val) && (typeof val !== "string" || isNaN(Date.parse(val)))) {
            isDate = false;
        }
        if (!isObj(val) || val instanceof Uint8Array) {
            isObject = false;
        }
    }

    if (!hasNonNull) return DataTypeRegistry.Utf8;
    if (isBinary) return DataTypeRegistry.Binary;
    if (isArrayVal) {
        const innerType = inferColumnType(allArrayElements);
        return DataTypeRegistry.Array(innerType);
    }
    if (isBoolean) return DataTypeRegistry.Boolean;
    if (isBigInt) return DataTypeRegistry.Int64;
    if (isNumeric && !isInteger) return DataTypeRegistry.Float64;
    if (isNumeric && isInteger) {
        let fitsInInt32 = true;
        for (let i = 0; i < col.length; i++) {
            const val = col[i];
            if (val == null) continue;
            if (val < -2147483648 || val > 2147483647) {
                fitsInInt32 = false;
                break;
            }
        }
        return fitsInInt32 ? DataTypeRegistry.Int32 : DataTypeRegistry.Float64;
    }
    if (isDate && hasDateObj) return DataTypeRegistry.Datetime;
    if (isObject) return DataTypeRegistry.Object;
    return DataTypeRegistry.Utf8;
}

export function gatherColumnsByIndices(columns: ColumnDict, indices: number[]): ColumnDict {
    const keys = Object.keys(columns);
    const numKeys = keys.length;
    const newHeight = indices.length;
    const res: ColumnDict = {};
    for (let j = 0; j < numKeys; j++) {
        const k = keys[j];
        const oldCol = columns[k];
        const newCol = isTypedArray(oldCol)
            ? new (oldCol.constructor as any)(newHeight)
            : new Array(newHeight);
        for (let idx = 0; idx < newHeight; idx++) {
            newCol[idx] = oldCol[indices[idx]];
        }
        res[k] = newCol;
    }
    return res;
}

/**
 * Computes a hash string for a row at the given index, using one or more column keys.
 * Includes a single-key fast path to avoid array allocation and join overhead.
 */
export function computeRowHash(columns: ColumnDict, keys: string[], rowIndex: number): string {
    const len = keys.length;
    if (len === 1) {
        const val = columns[keys[0]][rowIndex];
        return val == null ? "" : toCanonicalString(val);
    }
    const vals = new Array(len);
    for (let i = 0; i < len; i++) {
        const val = columns[keys[i]][rowIndex];
        vals[i] = val == null ? "" : toCanonicalString(val);
    }
    return vals.join(KEY_SEPARATOR);
}

export function coerceColumn(col: ColumnData, type: RegisteredDataType, height: number): ColumnData {
    let newCol: any = type.allocate ? type.allocate(height) : new Array(height);
    const isTyped = isTypedArray(newCol);
    if (isTyped) {
        const typedCol = newCol as any;
        for (let i = 0; i < height; i++) {
            const coerced = type.coerce(col[i]);
            if (coerced == null) {
                const fallback = new Array(height);
                for (let j = 0; j < i; j++) {
                    fallback[j] = typedCol[j];
                }
                fallback[i] = null;
                for (let j = i + 1; j < height; j++) {
                    fallback[j] = type.coerce(col[j]);
                }
                return fallback;
            }
            typedCol[i] = coerced;
        }
    } else {
        for (let i = 0; i < height; i++) {
            newCol[i] = type.coerce(col[i]);
        }
    }
    return newCol;
}

export function writeStringToFileOrStream(
    file: string | { write: (str: string) => void } | undefined,
    content: string
): void {
    if (!file) return;
    if (typeof file === "string") {
        if (typeof require !== "function") {
            throw new Error("File writing is not supported in this environment (missing require('fs')).");
        }
        const fs = require("fs");
        fs.writeFileSync(file, content, "utf8");
    } else if (isObj(file) && typeof (file as any).write === "function") {
        (file as any).write(content);
    } else {
        throw new TypeError("Invalid file argument. Expected a file path string or a writable stream/object with a write method.");
    }
}

