import type { IExpr, ColumnData } from "../types"
import { DataType, DataTypeRegistry } from "../datatypes"
import { KEY_SEPARATOR } from "./constants"
import { isObj } from "../utils"

function partition_by_columns(
    columns: Record<string, ColumnData>,
    height: number,
    partitionKeys: (string | IExpr)[]
): Map<string, number[]> {
    const partitionMap = new Map<string, number[]>();

    const pKeysLen = partitionKeys.length;
    const keyColumns = new Array(pKeysLen);
    for (let i = 0; i < pKeysLen; i++) {
        const pKey = partitionKeys[i];
        if (typeof pKey === "string") {
            if (!(pKey in columns)) {
                throw new Error(`Partition key "${pKey}" does not exist in the DataFrame.`);
            }
            keyColumns[i] = columns[pKey];
        } else {
            keyColumns[i] = pKey.evaluate(columns, height);
        }
    }

    for (let i = 0; i < height; i++) {
        const keyValues = new Array(keyColumns.length);
        for (let j = 0; j < keyColumns.length; j++) {
            const val = keyColumns[j][i];
            keyValues[j] = val == null ? "" : String(val);
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

export function resolveWindowExpr(expr: IExpr, columns: Record<string, ColumnData>, height: number): ColumnData {
    const results = new Array(height);
    if (height === 0) return results;

    const partitionKeys = expr.partitionBy || [];
    const partitionGroups = partition_by_columns(columns, height, partitionKeys);

    const prePartitionArray = expr.evaluatePrePartition(columns, height);

    for (const indices of partitionGroups.values()) {
        const groupLen = indices.length;
        const groupPreValues = new Array(groupLen);
        for (let k = 0; k < groupLen; k++) {
            groupPreValues[k] = prePartitionArray[indices[k]];
        }

        if (expr.evaluateWindow) {
            for (let k = 0; k < groupLen; k++) {
                results[indices[k]] = expr.evaluateWindow(groupPreValues, indices, k);
            }
            continue;
        }

        if (expr.aggFn) {
            const aggregatedVal = expr.aggFn(groupPreValues);
            for (let k = 0; k < groupLen; k++) {
                results[indices[k]] = aggregatedVal;
            }
            continue;
        }

        for (let k = 0; k < groupLen; k++) {
            results[indices[k]] = prePartitionArray[indices[k]];
        }
    }

    return expr.evaluatePostPartition(results, columns);
}


export function getRowJoinKeys(row: any, keys: any[]): { hash: string; hasNull: boolean } {
    if (!row) {
        return { hash: "", hasNull: true };
    }
    const len = keys.length;
    const vals = new Array(len);
    let hasNull = false;
    for (let i = 0; i < len; i++) {
        const val = row[keys[i]];
        if (val == null) {
            hasNull = true;
            vals[i] = "";
        } else {
            vals[i] = String(val);
        }
    }
    return {
        hash: vals.join(KEY_SEPARATOR),
        hasNull
    };
}

export function rowsToColumns(rows: any[]): { columns: Record<string, ColumnData>; height: number } {
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

export function columnsToRows(columns: Record<string, ColumnData>, height: number): any[] {
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

export function getRowFromColumns(columns: Record<string, ColumnData>, idx: number, keys: string[]): any {
    const row: any = {};
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const val = columns[k][idx];
        row[k] = val === undefined ? null : val;
    }
    return row;
}

export function inferColumnType(col: ColumnData): DataType {
    if (col.length === 0) return DataTypeRegistry.Utf8;
    let isBoolean = true;
    let isInteger = true;
    let isNumeric = true;
    let isBigInt = true;
    let isDate = true;
    let isList = true;
    let hasDateObj = false;
    let hasNonNull = false;
    const allListElements: any[] = [];

    for (let i = 0; i < col.length; i++) {
        const val = col[i];
        if (val == null) continue;
        hasNonNull = true;

        if (!Array.isArray(val)) {
            isList = false;
        } else {
            for (let j = 0; j < val.length; j++) {
                allListElements.push(val[j]);
            }
        }
        if (val instanceof Date) hasDateObj = true;
        if (typeof val !== "boolean") isBoolean = false;
        if (typeof val !== "bigint") isBigInt = false;
        if (typeof val !== "number") {
            isNumeric = false;
            isInteger = false;
        } else {
            if (!Number.isInteger(val)) isInteger = false;
        }
        if (!(val instanceof Date) && (typeof val !== "string" || isNaN(Date.parse(val)))) {
            isDate = false;
        }
    }

    if (!hasNonNull) return DataTypeRegistry.Utf8;
    if (isList) {
        const innerType = inferColumnType(allListElements);
        return DataTypeRegistry.List(innerType);
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
    return DataTypeRegistry.Utf8;
}
