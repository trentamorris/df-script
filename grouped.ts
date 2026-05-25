import { DataFrame, getRowFromColumns, inferColumnType } from "./dataframe"
import { resolveColumnSelectors } from "./columnExpressions"
import { DataType } from "./datatypes"
import type { IExpr } from "./types"

export class GroupedData<T, K extends keyof T> {
    private groups: Map<string, number[]>
    private keys: K[]
    private allKeys: (keyof T)[]
    private parentColumns: Record<string, any[]>
    private parentHeight: number
    private parentSchema: Record<string, DataType>


    constructor(
        groups: Map<string, number[]>,
        keys: K[],
        allKeys: (keyof T)[],
        parentColumns: Record<string, any[]>,
        parentHeight: number,
        parentSchema: Record<string, DataType>
    ) {
        this.groups = groups
        this.keys = keys
        this.allKeys = allKeys
        this.parentColumns = parentColumns
        this.parentHeight = parentHeight
        this.parentSchema = parentSchema
    }

    collect(): DataFrame<any> {
        const keysStr = this.keys.map(String);
        const numGroups = this.groups.size;
        const newColumns: Record<string, any[]> = {};
        for (let i = 0; i < keysStr.length; i++) {
            newColumns[keysStr[i]] = new Array(numGroups);
        }

        let groupIdx = 0;
        for (const indices of this.groups.values()) {
            if (indices.length === 0) continue;
            const firstIdx = indices[0];
            for (let i = 0; i < keysStr.length; i++) {
                const k = keysStr[i];
                const val = this.parentColumns[k][firstIdx];
                newColumns[k][groupIdx] = val === undefined ? null : val;
            }
            groupIdx++;
        }

        const outSchema: Record<string, DataType> = {};
        for (const k of keysStr) {
            outSchema[k] = this.parentSchema[k];
        }

        return new DataFrame(newColumns, outSchema, groupIdx);
    }

    agg(...exprs: (IExpr | any)[]): DataFrame<any> {
        const allKeysStr = this.allKeys.map(String);
        const keysStr = this.keys.map(String);
        const expandedExprs = resolveColumnSelectors(exprs.flat(), allKeysStr, keysStr);

        const numGroups = this.groups.size;
        const newColumns: Record<string, any[]> = {};

        for (let i = 0; i < keysStr.length; i++) {
            newColumns[keysStr[i]] = new Array(numGroups);
        }
        for (let i = 0; i < expandedExprs.length; i++) {
            const e = expandedExprs[i];
            const targetKey = e.outputName || e.colName || "*";
            newColumns[targetKey] = new Array(numGroups);
        }

        let groupIdx = 0;
        for (const indices of this.groups.values()) {
            if (indices.length === 0) continue;
            const firstIdx = indices[0];

            const firstRow = getRowFromColumns(this.parentColumns, firstIdx, allKeysStr);

            for (let i = 0; i < keysStr.length; i++) {
                const k = keysStr[i];
                newColumns[k][groupIdx] = firstRow[k];
            }

            let groupRows: any[] | null = null;

            for (let i = 0; i < expandedExprs.length; i++) {
                const e = expandedExprs[i];
                const targetKey = e.outputName || e.colName || "*";

                if (e.aggFn) {
                    if (groupRows === null) {
                        groupRows = indices.map(idx => getRowFromColumns(this.parentColumns, idx, allKeysStr));
                    }
                    const groupValues = groupRows.map(r => e.evaluatePreGrouping(r));
                    const aggregated = e.aggFn(groupValues);
                    newColumns[targetKey][groupIdx] = e.evaluatePostGrouping(aggregated, firstRow);
                } else {
                    newColumns[targetKey][groupIdx] = e.evaluate(firstRow);
                }
            }
            groupIdx++;
        }

        const outSchema: Record<string, DataType> = {};
        for (const k of keysStr) {
            outSchema[k] = this.parentSchema[k];
        }
        for (const e of expandedExprs) {
            const targetKey = e.outputName || e.colName || "*";
            outSchema[targetKey] = inferColumnType(newColumns[targetKey]);
        }

        return new DataFrame(newColumns, outSchema, groupIdx);
    }
}