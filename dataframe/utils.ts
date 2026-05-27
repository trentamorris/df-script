import { ColumnExpr, AllColumnsExpr, resolveColumnSelectors } from "../columnExpressions"
import type { IExpr } from "../types"
import type { JoinType, LimitPosition, ConcatOptions } from "./types"
import { DataType, DataTypeRegistry } from "../datatypes"

export function partition_by_columns(
    columns: Record<string, any[]>,
    height: number,
    partitionKeys: (string | IExpr)[]
): Map<string, number[]> {
    const partitionMap = new Map<string, number[]>();

    const keyColumns = partitionKeys.map(pKey => {
        return typeof pKey === "string" 
            ? (columns[pKey] || new Array(height).fill(null)) 
            : pKey.evaluate(columns, height);
    });

    for (let i = 0; i < height; i++) {
        const keyValues = new Array(keyColumns.length);
        for (let j = 0; j < keyColumns.length; j++) {
            keyValues[j] = keyColumns[j][i];
        }
        const hash = JSON.stringify(keyValues);
        let group = partitionMap.get(hash);
        if (group === undefined) {
            group = [];
            partitionMap.set(hash, group);
        }
        group.push(i);
    }
    return partitionMap;
}

export function resolveWindowExpr(expr: IExpr, columns: Record<string, any[]>, height: number): any[] {
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
        } else if (expr.aggFn) {
            const aggregatedVal = expr.aggFn(groupPreValues);
            for (let k = 0; k < groupLen; k++) {
                results[indices[k]] = aggregatedVal;
            }
        } else {
            for (let k = 0; k < groupLen; k++) {
                results[indices[k]] = prePartitionArray[indices[k]];
            }
        }
    }

    return expr.evaluatePostPartition(results, columns);
}

export function ensureArray<T>(val: T | T[] | null | undefined): T[] {
    if (val == null) return [];
    return Array.isArray(val) ? val : [val];
}

export function hashRowKeys(row: any, keys: any[]): string {
    const len = keys.length;
    const vals = new Array(len);
    for (let i = 0; i < len; i++) {
        const val = row[keys[i]];
        vals[i] = val === undefined ? null : val;
    }
    return JSON.stringify(vals);
}

export function getRowJoinKeys(row: any, keys: any[]): { hash: string; hasNull: boolean } {
    const len = keys.length;
    const vals = new Array(len);
    let hasNull = false;
    for (let i = 0; i < len; i++) {
        const val = row[keys[i]];
        if (val == null) {
            hasNull = true;
        }
        vals[i] = val;
    }
    return {
        hash: JSON.stringify(vals),
        hasNull
    };
}

export function rowsToColumns(rows: any[]): { columns: Record<string, any[]>; height: number } {
    if (!Array.isArray(rows) || rows.length === 0) {
        return { columns: {}, height: 0 };
    }
    const height = rows.length;
    const keys = Object.keys(rows[0]);
    const columns: Record<string, any[]> = {};
    for (let i = 0; i < keys.length; i++) {
        columns[keys[i]] = new Array(height);
    }
    for (let r = 0; r < height; r++) {
        const row = rows[r];
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const val = row[k];
            columns[k][r] = val === undefined ? null : val;
        }
    }
    return { columns, height };
}

export function columnsToRows(columns: Record<string, any[]>, height: number): any[] {
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

export function getRowFromColumns(columns: Record<string, any[]>, idx: number, keys: string[]): any {
    const row: any = {};
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const val = columns[k][idx];
        row[k] = val === undefined ? null : val;
    }
    return row;
}

export function inferColumnType(col: any[]): DataType {
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
            allListElements.push(...val);
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
    if (isNumeric) {
        if (isInteger) {
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
        return DataTypeRegistry.Float64;
    }
    if (isDate && hasDateObj) return DataTypeRegistry.Datetime;
    return DataTypeRegistry.Utf8;
}
