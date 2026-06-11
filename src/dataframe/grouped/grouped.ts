import { DataFrame } from "../dataframe"
import { inferColumnType } from "../utils"
import type { GroupMap } from "../types"
import { resolveColumnSelectors, ALL_COLUMNS_MARKER } from "../../columnExpressions"
import type { IExpr, ColumnDict, RowRecord, DataFrameSchema } from "../../types"

export class GroupedData<T, K extends keyof T> {
    private groups: GroupMap
    private keys: K[]
    private allKeys: (keyof T)[]
    private parentColumns: ColumnDict
    private parentHeight: number
    private parentSchema: DataFrameSchema


    constructor(
        groups: GroupMap,
        keys: K[],
        allKeys: (keyof T)[],
        parentColumns: ColumnDict,
        parentHeight: number,
        parentSchema: DataFrameSchema
    ) {
        this.groups = groups
        this.keys = keys
        this.allKeys = allKeys
        this.parentColumns = parentColumns
        this.parentHeight = parentHeight
        this.parentSchema = parentSchema
    }

    to_dataframe<U extends RowRecord = any>(): DataFrame<U> {
        const keysLen = this.keys.length;
        const keysStr = new Array(keysLen);
        for (let i = 0; i < keysLen; i++) {
            keysStr[i] = String(this.keys[i]);
        }
        const numGroups = this.groups.size;
        const newColumns: Record<string, any> = {};
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

        const outSchema: DataFrameSchema = {};
        for (const k of keysStr) {
            outSchema[k] = this.parentSchema[k];
        }

        return DataFrame._createDirect<U>(newColumns as any, outSchema, groupIdx);
    }

    agg<U extends RowRecord = any>(...exprs: (IExpr | any)[]): DataFrame<U> {
        const allKeysLen = this.allKeys.length;
        const allKeysStr = new Array(allKeysLen);
        for (let i = 0; i < allKeysLen; i++) {
            allKeysStr[i] = String(this.allKeys[i]);
        }

        const keysLen = this.keys.length;
        const keysStr = new Array(keysLen);
        for (let i = 0; i < keysLen; i++) {
            keysStr[i] = String(this.keys[i]);
        }
        const expandedExprs = resolveColumnSelectors(exprs.flat(), allKeysStr, keysStr, this.parentSchema);

        const numGroups = this.groups.size;
        const newColumns: Record<string, any> = {};

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

        for (let i = 0; i < expandedExprs.length; i++) {
            const e = expandedExprs[i];
            const targetKey = e.outputName || e.colName || ALL_COLUMNS_MARKER;

            if (!e.aggFn) {
                newColumns[targetKey] = e.evaluate(newColumns, numGroups);
            } else {
                const preGroupedCol = e.evaluatePre(e.groupingOpsIndex, this.parentColumns, this.parentHeight);
                const aggregatedGroupValues = new Array(numGroups);
                let gIdx = 0;
                for (const indices of this.groups.values()) {
                    if (indices.length === 0) continue;
                    const groupValues = new Array(indices.length);
                    for (let k = 0; k < indices.length; k++) {
                        groupValues[k] = preGroupedCol[indices[k]];
                    }
                    aggregatedGroupValues[gIdx] = e.aggFn(groupValues);
                    gIdx++;
                }
                newColumns[targetKey] = e.evaluatePost(e.groupingOpsIndex, aggregatedGroupValues, newColumns);
            }
        }

        const outSchema: DataFrameSchema = {};
        for (const k of keysStr) {
            outSchema[k] = this.parentSchema[k];
        }
        for (const e of expandedExprs) {
            const targetKey = e.outputName || e.colName || ALL_COLUMNS_MARKER;
            outSchema[targetKey] = inferColumnType(newColumns[targetKey]);
        }

        return DataFrame._createDirect<U>(newColumns as any, outSchema, groupIdx);
    }
}
