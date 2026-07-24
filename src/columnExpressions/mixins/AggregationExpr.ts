import type { AggFn, UniqueArrayStatsOptions } from "../../types"
import { ExprBase, derive } from "../ExprBase"
import { kleeneBinary } from "../utils"
import { ComputeError } from "../../exceptions"
import { getArrayStats, computeMedian, computeQuantile, getUniqueArrayStats, computeMode, isArrayOfType, computeStatisticalMatrix, computeDotProduct, computeSpearmanCorrelation, computeWeightedAverage } from "../../utils"



export class AggregationExpr extends ExprBase {

    _deriveAgg(fn: AggFn<any>) {
        const newInst = derive(this);
        newInst._aggFn = fn;
        newInst._groupingOpsIndex = this._ops.length;
        newInst._partitionOpsIndex = this._ops.length;
        return newInst;
    }

    _deriveAggBinary(other: any, fn: AggFn<[any, any]>) {
        return derive(this, kleeneBinary(this, other, (x, y) => [x, y]))._deriveAgg(fn);
    }

    /**
     * Aggregation: Returns true if all values in the group are truthy.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A", "B"], val: [true, true, false] })
     * >>> df.group_by("group").agg($df.col("val").all().alias("all_true"))
     * shape: (2, 2)
     * ┌───────┬──────────┐
     * │ group │ all_true │
     * ├───────┼──────────┤
     * │ "A"   │ true     │
     * │ "B"   │ false    │
     * └───────┴──────────┘
     */
    all() {
        return this._deriveAgg(v => isArrayOfType(v, (x) => !!x, { mode: "every" }));
    }

    /**
     * Aggregation: Checks if all values in the group are null.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A"], val: [null, null] })
     * >>> df.group_by("group").agg($df.col("val").all_null().alias("is_null"))
     * shape: (1, 2)
     * ┌───────┬─────────┐
     * │ group │ is_null │
     * ├───────┼─────────┤
     * │ "A"   │ true    │
     * └───────┴─────────┘
     */
    all_null() {
        return this._deriveAgg(v => isArrayOfType(v, "nullish", { mode: "every" }));
    }

    /**
     * Aggregation: Checks if any value in the group is truthy.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A", "B"], val: [true, false, false] })
     * >>> df.group_by("group").agg($df.col("val").any().alias("any_true"))
     * shape: (2, 2)
     * ┌───────┬──────────┐
     * │ group │ any_true │
     * ├───────┼──────────┤
     * │ "A"   │ true     │
     * │ "B"   │ false    │
     * └───────┴──────────┘
     */
    any() {
        return this._deriveAgg(v => isArrayOfType(v, (x) => !!x, { mode: "some" }));
    }

    /**
     * Aggregation: Checks if any value in the group is null.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A"], val: [10, null] })
     * >>> df.group_by("group").agg($df.col("val").any_null().alias("has_null"))
     * shape: (1, 2)
     * ┌───────┬──────────┐
     * │ group │ has_null │
     * ├───────┼──────────┤
     * │ "A"   │ true     │
     * └───────┴──────────┘
     */
    any_null() {
        return this._deriveAgg(v => isArrayOfType(v, "nullish", { mode: "some" }));
    }

    /**
     * Aggregation: Computes the arithmetic mean of the group.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A"], val: [10, 20] })
     * >>> df.group_by("group").agg($df.col("val").avg().alias("mean"))
     * shape: (1, 2)
     * ┌───────┬──────┐
     * │ group │ mean │
     * ├───────┼──────┤
     * │ "A"   │ 15   │
     * └───────┴──────┘
     */
    avg() {
        return this._deriveAgg(v => getArrayStats(v).mean);
    }

    /**
     * Aggregation: Computes the Pearson correlation coefficient between two columns.
     * @param other The target column expression to correlate with.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ x: [1, 2, 3], y: [2, 4, 6] })
     * >>> df.select($df.col("x").corr($df.col("y")).alias("correlation"))
     * shape: (1, 1)
     * ┌─────────────┐
     * │ correlation │
     * ├─────────────┤
     * │ 1           │
     * └─────────────┘
     */
    corr(other: any) {
        return this._deriveAggBinary(other, pairs => computeStatisticalMatrix(pairs)?.correlation ?? null);
    }

    /**
     * Aggregation: Returns the count of records inside the group.
     * @param options Config flags including whether to count null values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A"], val: [10, null] })
     * >>> df.group_by("group").agg($df.col("val").count().alias("cnt"))
     * shape: (1, 2)
     * ┌───────┬─────┐
     * │ group │ cnt │
     * ├───────┼─────┤
     * │ "A"   │ 1   │
     * └───────┴─────┘
     */
    count(options: { includeNulls?: boolean } = {}) {
        if (options.includeNulls) return this._deriveAgg(v => v.length);
        return this._deriveAgg(v => getArrayStats(v).count);
    }

    /**
     * Aggregation: Computes the covariance between two columns.
     * @param other The target column expression to compute covariance with.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ x: [1, 2, 3], y: [2, 4, 6] })
     * >>> df.select($df.col("x").cov($df.col("y")).alias("covariance"))
     * shape: (1, 1)
     * ┌────────────┐
     * │ covariance │
     * ├────────────┤
     * │ 2          │
     * └────────────┘
     */
    cov(other: any) {
        return this._deriveAggBinary(other, pairs => computeStatisticalMatrix(pairs)?.covariance ?? null);
    }

    /**
     * Aggregation: Computes the dot product with another column.
     * @param other The other column expression to compute the dot product with.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ x: [1, 2, 3], y: [2, 3, 4] })
     * >>> df.select($df.col("x").dot($df.col("y")).alias("dot_product"))
     * shape: (1, 1)
     * ┌─────────────┐
     * │ dot_product │
     * ├─────────────┤
     * │ 20          │
     * └─────────────┘
     */
    dot(other: any) {
        return this._deriveAggBinary(other, pairs => computeDotProduct(pairs));
    }

    /**
     * Aggregation: Finds the first value in the group.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A"], val: [10, 20] })
     * >>> df.group_by("group").agg($df.col("val").first().alias("first_val"))
     * shape: (1, 2)
     * ┌───────┬───────────┐
     * │ group │ first_val │
     * ├───────┼───────────┤
     * │ "A"   │ 10        │
     * └───────┴───────────┘
     */
    first() {
        return this._deriveAgg(v => v[0] ?? null);
    }

    /**
     * Aggregation: Combines all values in the group into a single array/list cell.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A"], val: [10, 20] })
     * >>> df.group_by("group").agg($df.col("val").implode().alias("list_val"))
     * shape: (1, 2)
     * ┌───────┬──────────┐
     * │ group │ list_val │
     * ├───────┼──────────┤
     * │ "A"   │ [10, 20] │
     * └───────┴──────────┘
     */
    implode() {
        return this._deriveAgg(v => v);
    }

    /**
     * Aggregation: Finds the last value in the group.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A"], val: [10, 20] })
     * >>> df.group_by("group").agg($df.col("val").last().alias("last_val"))
     * shape: (1, 2)
     * ┌───────┬──────────┐
     * │ group │ last_val │
     * ├───────┼──────────┤
     * │ "A"   │ 20       │
     * └───────┴──────────┘
     */
    last() {
        return this._deriveAgg(v => v[v.length - 1] ?? null);
    }

    /**
     * Aggregation: Finds the maximum value in the group.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A"], val: [10, 50] })
     * >>> df.group_by("group").agg($df.col("val").max().alias("max_val"))
     * shape: (1, 2)
     * ┌───────┬─────────┐
     * │ group │ max_val │
     * ├───────┼─────────┤
     * │ "A"   │ 50      │
     * └───────┴─────────┘
     */
    max() {
        return this._deriveAgg(v => getArrayStats(v).max);
    }

    /**
     * Aggregation: Computes the arithmetic mean of elements in the group.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A"], val: [10, 30] })
     * >>> df.group_by("group").agg($df.col("val").mean().alias("mean_val"))
     * shape: (1, 2)
     * ┌───────┬──────────┐
     * │ group │ mean_val │
     * ├───────┼──────────┤
     * │ "A"   │ 20       │
     * └───────┴──────────┘
     */
    mean() {
        return this.avg();
    }

    /**
     * Aggregation: Computes the 50th percentile median.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A", "A"], val: [10, 50, 20] })
     * >>> df.group_by("group").agg($df.col("val").median().alias("med"))
     * shape: (1, 2)
     * ┌───────┬─────┐
     * │ group │ med │
     * ├───────┼─────┤
     * │ "A"   │ 20  │
     * └───────┴─────┘
     */
    median() {
        return this._deriveAgg(v => computeMedian(v));
    }

    /**
     * Aggregation: Finds the minimum value in the group.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A"], val: [10, 50] })
     * >>> df.group_by("group").agg($df.col("val").min().alias("min_val"))
     * shape: (1, 2)
     * ┌───────┬─────────┐
     * │ group │ min_val │
     * ├───────┼─────────┤
     * │ "A"   │ 10      │
     * └───────┴─────────┘
     */
    min() {
        return this._deriveAgg(v => getArrayStats(v).min);
    }

    /**
     * Aggregation: Finds the statistical mode (most frequent value).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A", "A"], val: [5, 5, 10] })
     * >>> df.group_by("group").agg($df.col("val").mode().alias("mode_val"))
     * shape: (1, 2)
     * ┌───────┬──────────┐
     * │ group │ mode_val │
     * ├───────┼──────────┤
     * │ "A"   │ 5        │
     * └───────┴──────────┘
     */
    mode() {
        return this._deriveAgg(v => computeMode(v));
    }

    /**
     * Aggregation: Computes number of unique elements.
     * @param options Uniqueness options.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A", "A"], val: [5, 5, 10] })
     * >>> df.group_by("group").agg($df.col("val").n_unique().alias("unique_cnt"))
     * shape: (1, 2)
     * ┌───────┬────────────┐
     * │ group │ unique_cnt │
     * ├───────┼────────────┤
     * │ "A"   │ 2          │
     * └───────┴────────────┘
     */
    n_unique(options: UniqueArrayStatsOptions = {}) {
        return this._deriveAgg(v => {
            return getUniqueArrayStats(v, options).count;
        });
    }

    /**
     * Aggregation: Counts the number of null or missing records.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A"], val: [10, null] })
     * >>> df.group_by("group").agg($df.col("val").null_count().alias("nulls"))
     * shape: (1, 2)
     * ┌───────┬───────┐
     * │ group │ nulls │
     * ├───────┼───────┤
     * │ "A"   │ 1     │
     * └───────┴───────┘
     */
    null_count() {
        return this._deriveAgg(v => getArrayStats(v).nullCount);
    }

    /**
     * Aggregation: Computes the specific quantile values (0.0 to 1.0).
     * @param q The quantile parameter value between 0.0 and 1.0.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [10, 20, 30, 40] })
     * >>> df.select($df.col("val").quantile(0.75).alias("q75"))
     * shape: (1, 1)
     * ┌─────┐
     * │ q75 │
     * ├─────┤
     * │ 32.5│
     * └─────┘
     */
    quantile(q: number) {
        if (q < 0 || q > 1) throw new ComputeError("Quantile q must be between 0 and 1");
        return this._deriveAgg(v => computeQuantile(v, q));
    }

    /**
     * Aggregation: Computes the Spearman rank correlation coefficient.
     * @param other The other column expression to correlate with.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ x: [1, 2, 3], y: [5, 6, 7] })
     * >>> df.select($df.col("x").spearman_corr($df.col("y")).alias("spearman"))
     * shape: (1, 1)
     * ┌──────────┐
     * │ spearman │
     * ├──────────┤
     * │ 1        │
     * └──────────┘
     */
    spearman_corr(other: any) {
        return this._deriveAggBinary(other, pairs => computeSpearmanCorrelation(pairs));
    }

    /**
     * Aggregation: Computes sample standard deviation.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A", "A"], val: [10, 20, 30] })
     * >>> df.group_by("group").agg($df.col("val").std().alias("std_dev"))
     * shape: (1, 2)
     * ┌───────┬─────────┐
     * │ group │ std_dev │
     * ├───────┼─────────┤
     * │ "A"   │ 10      │
     * └───────┴─────────┘
     */
    std() {
        return this._deriveAgg(v => getArrayStats(v).std);
    }

    /**
     * Aggregation: Computes the sum of elements in the group.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ group: ["A", "A"], val: [10, 20] })
     * >>> df.group_by("group").agg($df.col("val").sum().alias("total"))
     * shape: (1, 2)
     * ┌───────┬───────┐
     * │ group │ total │
     * ├───────┼───────┤
     * │ "A"   │ 30    │
     * └───────┴───────┘
     */
    sum() {
        return this._deriveAgg(v => getArrayStats(v).sum);
    }

    /**
     * Aggregation: Computes weighted average.
     * @param weights The weight values or column expression.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [10, 20], weight: [1, 3] })
     * >>> df.select($df.col("val").w_avg($df.col("weight")).alias("w_mean"))
     * shape: (1, 1)
     * ┌────────┐
     * │ w_mean │
     * ├────────┤
     * │ 17.5   │
     * └────────┘
     */
    w_avg(weights: any) {
        return this._deriveAggBinary(weights, pairs => computeWeightedAverage(pairs));
    }

}
