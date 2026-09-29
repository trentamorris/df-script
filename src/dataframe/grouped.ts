import { DataFrame } from "./dataframe"
import { inferColumnType, coerceColumn, gatherColumnByIndices } from "./utils"
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
    private _keys: K[]
    private _allKeys: (keyof T)[]
    private _parentColumns: ColumnDict
    private _parentHeight: number
    private _parentSchema: DataFrameSchema
    private _synthesizedColumns?: Record<string, any[]>
    private _groupIndicesList: number[][]
    private _firstIndices: number[]

    constructor(
        groups: GroupMap,
        keys: K[],
        allKeys: (keyof T)[],
        parentColumns: ColumnDict,
        parentHeight: number,
        parentSchema: DataFrameSchema,
        synthesizedColumns?: Record<string, any[]>
    ) {
        this._keys = keys
        this._allKeys = allKeys
        this._parentColumns = parentColumns
        this._parentHeight = parentHeight
        this._parentSchema = parentSchema
        this._synthesizedColumns = synthesizedColumns

        const numGroups = groups.size;
        const groupList = new Array<number[]>(numGroups);
        const firstIdxs = new Array<number>(numGroups);
        let g = 0;
        for (const indices of groups.values()) {
            groupList[g] = indices;
            firstIdxs[g++] = indices[0];
        }
        this._groupIndicesList = groupList;
        this._firstIndices = firstIdxs;
    }

    private _materializeKeyColumns(keys: string[]): { newColumns: ColumnDict; outSchema: DataFrameSchema; groupCount: number } {
        const keysCount = keys.length;
        const newColumns: ColumnDict = {};
        const outSchema: DataFrameSchema = {};

        for (let i = 0; i < keysCount; i++) {
            const k = keys[i];
            outSchema[k] = this._parentSchema[k];
            const synth = this._synthesizedColumns?.[k];
            newColumns[k] = synth ? synth : gatherColumnByIndices(this._parentColumns[k], this._firstIndices);
        }

        return { newColumns, outSchema, groupCount: this._firstIndices.length };
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
        const keys = this._keys as unknown as string[];
        const allKeys = this._allKeys as unknown as string[];
        const normalizedExprs = DataFrame._normalizeArgs(exprs);
        const expandedExprs = resolveColumnSelectors(normalizedExprs, allKeys, keys, this._parentSchema, this._parentColumns);

        const { newColumns, outSchema, groupCount } = this._materializeKeyColumns(keys);
        const groupIndicesList = this._groupIndicesList;
        const numGroups = groupIndicesList.length;

        for (let i = 0, len = expandedExprs.length; i < len; i++) {
            const e = expandedExprs[i];
            const targetKey = e._outputName || e._colName || ALL_COLUMNS_MARKER;

            let evaluated: any;
            if (!e._aggFn) {
                evaluated = e.evaluate(newColumns, numGroups);
            } else {
                const pre = e._evaluatePre(e._groupingOpsIndex, this._parentColumns, this._parentHeight);
                const aggregated = new Array(numGroups);
                for (let g = 0; g < numGroups; g++) {
                    const indices = groupIndicesList[g];
                    aggregated[g] = e._aggFn(gatherColumnByIndices(pre, indices) as any[]);
                }
                evaluated = e._evaluatePost(e._groupingOpsIndex, aggregated, newColumns);
            }

            const type = resolveExprOutputType(e, this._parentSchema, evaluated)
                || inferColumnType(evaluated)
                || this._parentSchema[targetKey]
                || DataTypeRegistry.Utf8;

            outSchema[targetKey] = type;
            newColumns[targetKey] = coerceColumn(evaluated, type, groupCount);
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
        const { newColumns, outSchema, groupCount } = this._materializeKeyColumns(this._keys as unknown as string[]);
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
