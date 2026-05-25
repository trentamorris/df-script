import { ColumnExpr, AllColumnsExpr, resolveColumnSelectors } from "../columnExpressions"
import type { IExpr } from "../types"
import type { JoinType, LimitPosition, ConcatOptions } from "./types"
import { DataType, DataTypeRegistry } from "../datatypes"

export function partition_by(data: any[], partitionKeys: (string | IExpr)[]): Map<string, number[]> {
    const partitionMap = new Map<string, number[]>();
    const len = data.length;

    for (let i = 0; i < len; i++) {
        const row = data[i];
        const keyValues = [];
        for (let j = 0; j < partitionKeys.length; j++) {
            const pKey = partitionKeys[j];
            const val = typeof pKey === "string" ? row[pKey] : pKey.evaluate(row);
            keyValues.push(val);
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

export function resolveWindowExpr(expr: IExpr, data: any[]): any[] {
    const len = data.length;
    const results = new Array(len);
    if (len === 0) return results;

    const partitionKeys = expr.partitionBy || [];
    const partitionGroups = partition_by(data, partitionKeys);

    for (const indices of partitionGroups.values()) {
        const groupLen = indices.length;
        const partitionRows = indices.map(idx => data[idx]);

        for (let k = 0; k < groupLen; k++) {
            const targetIdx = indices[k];
            if (expr.evaluateWindow) {
                results[targetIdx] = expr.evaluateWindow(partitionRows, indices, k);
            } else {
                results[targetIdx] = expr.evaluate(data[targetIdx]);
            }
        }
    }

    return results;
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
    let isDate = true;
    let hasNonNull = false;

    for (let i = 0; i < col.length; i++) {
        const val = col[i];
        if (val == null) continue;
        hasNonNull = true;

        if (typeof val !== "boolean") isBoolean = false;
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
    if (isBoolean) return DataTypeRegistry.Boolean;
    if (isNumeric) return isInteger ? DataTypeRegistry.Int32 : DataTypeRegistry.Float64;
    if (isDate) return DataTypeRegistry.Datetime;
    return DataTypeRegistry.Utf8;
}
