import { DataFrame } from "./dataframe"
import { inferColumnType, coerceColumn } from "./utils"
import type { GroupMap, GroupedAggDelegatedOps } from "./types"
import { resolveColumnSelectors, ALL_COLUMNS_MARKER, resolveExprOutputType, ColumnExpr } from "../columnExpressions"
import { DataTypeRegistry } from "../datatypes"
import type { IExpr, ColumnDict, RowRecord, DataFrameSchema } from "../types"

export interface GroupedData<T extends RowRecord = any, K extends keyof T = keyof T> extends GroupedAggDelegatedOps<T> { }

/**
 * Represents a DataFrame grouped by key columns, supporting aggregation operations.
 * @namespace df
 * @category DataFrame
 * @syntax df.groupBy(...).{symbol}(...)
 */
export class GroupedData<T extends RowRecord = any, K extends keyof T = keyof T> {
    private _groups: GroupMap
    private _keys: K[]
    private _allKeys: (keyof T)[]
    private _parentColumns: ColumnDict
    private _parentHeight: number
    private _parentSchema: DataFrameSchema
    private _synthesizedColumns?: Record<string, any[]>

    constructor(
        groups: GroupMap,
        keys: K[],
        allKeys: (keyof T)[],
        parentColumns: ColumnDict,
        parentHeight: number,
        parentSchema: DataFrameSchema,
        synthesizedColumns?: Record<string, any[]>
    ) {
        this._groups = groups
        this._keys = keys
        this._allKeys = allKeys
        this._parentColumns = parentColumns
        this._parentHeight = parentHeight
        this._parentSchema = parentSchema
        this._synthesizedColumns = synthesizedColumns
    }

    private _materializeKeyColumns(keysStr: string[]): { newColumns: ColumnDict; outSchema: DataFrameSchema; groupCount: number } {
        const numGroups = this._groups.size;
        const keysCount = keysStr.length;
        const newColumns: ColumnDict = {};
        const outSchema: DataFrameSchema = {};

        for (let i = 0; i < keysCount; i++) {
            const k = keysStr[i];
            newColumns[k] = new Array(numGroups);
            outSchema[k] = this._parentSchema[k];
        }

        let groupIdx = 0;
        for (const indices of this._groups.values()) {
            if (indices.length === 0) continue;
            const firstIdx = indices[0];
            for (let i = 0; i < keysCount; i++) {
                const k = keysStr[i];
                const val = this._synthesizedColumns?.[k]
                    ? this._synthesizedColumns[k][groupIdx]
                    : this._parentColumns[k]?.[firstIdx];
                (newColumns[k] as any[])[groupIdx] = val === undefined ? null : val;
            }
            groupIdx++;
        }

        return { newColumns, outSchema, groupCount: groupIdx };
    }

    private _toStringKeys(keys: any[]): string[] {
        const len = keys.length;
        const result = new Array<string>(len);
        for (let i = 0; i < len; i++) {
            result[i] = String(keys[i]);
        }
        return result;
    }

    /**
     * Aggregates grouped partitions using aggregation column expressions.
     * @param exprs One or more aggregation column expressions.
     * @returns DataFrame
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").agg($df.col("val").sum().alias("sum_val"))
     * shape: (2, 2)
     * ┌───────┬─────────┐
     * │ group │ sum_val │
     * ├───────┼─────────┤
     * │ A     │ 30      │
     * │ B     │ 30      │
     * └───────┴─────────┘
     */
    agg<U extends RowRecord = any>(...exprs: (IExpr | any)[]): DataFrame<U> {
        const allKeysStr = this._toStringKeys(this._allKeys);
        const keysStr = this._toStringKeys(this._keys);
        const expandedExprs = resolveColumnSelectors(exprs.flat(), allKeysStr, keysStr, this._parentSchema, this._parentColumns);

        const { newColumns, outSchema, groupCount } = this._materializeKeyColumns(keysStr);
        const numGroups = this._groups.size;

        for (let i = 0; i < expandedExprs.length; i++) {
            const e = expandedExprs[i];
            const targetKey = e._outputName || e._colName || ALL_COLUMNS_MARKER;

            if (!e._aggFn) {
                newColumns[targetKey] = e.evaluate(newColumns, numGroups);
            } else {
                const preGroupedCol = e._evaluatePre(e._groupingOpsIndex, this._parentColumns, this._parentHeight);
                const aggregatedGroupValues = new Array(numGroups);
                let gIdx = 0;
                for (const indices of this._groups.values()) {
                    if (indices.length === 0) continue;
                    const groupValues = new Array(indices.length);
                    for (let k = 0; k < indices.length; k++) {
                        groupValues[k] = preGroupedCol[indices[k]];
                    }
                    aggregatedGroupValues[gIdx] = e._aggFn(groupValues);
                    gIdx++;
                }
                newColumns[targetKey] = e._evaluatePost(e._groupingOpsIndex, aggregatedGroupValues, newColumns);
            }
        }

        for (const e of expandedExprs) {
            const targetKey = e._outputName || e._colName || ALL_COLUMNS_MARKER;
            const type = resolveExprOutputType(e, this._parentSchema, newColumns[targetKey])
                || inferColumnType(newColumns[targetKey])
                || this._parentSchema[targetKey]
                || DataTypeRegistry.Utf8;
            outSchema[targetKey] = type;
            newColumns[targetKey] = coerceColumn(newColumns[targetKey], type, groupCount);
        }

        return DataFrame._createDirect<U>(newColumns as any, outSchema, groupCount);
    }

    /**
     * Converts group keys back into a single distinct DataFrame without aggregations.
     * @returns DataFrame
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").toDataframe()
     * shape: (2, 1)
     * ┌───────┐
     * │ group │
     * ├───────┤
     * │ A     │
     * │ B     │
     * └───────┘
     */
    toDataframe<U extends RowRecord = any>(): DataFrame<U> {
        const keysStr = this._toStringKeys(this._keys);
        const { newColumns, outSchema, groupCount } = this._materializeKeyColumns(keysStr);
        return DataFrame._createDirect<U>(newColumns as any, outSchema, groupCount);
    }
}

const GROUPED_AGG_METHODS: Record<keyof GroupedAggDelegatedOps, 1> = {
    all: 1,
    avg: 1,
    count: 1,
    first: 1,
    kurtosis: 1,
    last: 1,
    max: 1,
    mean: 1,
    median: 1,
    min: 1,
    nUnique: 1,
    skew: 1,
    std: 1,
    sum: 1,
    variance: 1,
};

for (const method in GROUPED_AGG_METHODS) {
    (GroupedData.prototype as any)[method] = function (this: GroupedData<any, any>, ...args: any[]) {
        const allExpr = new ColumnExpr(ALL_COLUMNS_MARKER) as any;
        return this.agg(allExpr[method](...args));
    };
}
