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

    all() {
        return this._deriveAgg(v => isArrayOfType(v, (x) => !!x, { mode: "every" }));
    }

    all_null() {
        return this._deriveAgg(v => isArrayOfType(v, "nullish", { mode: "every" }));
    }

    any() {
        return this._deriveAgg(v => isArrayOfType(v, (x) => !!x, { mode: "some" }));
    }

    any_null() {
        return this._deriveAgg(v => isArrayOfType(v, "nullish", { mode: "some" }));
    }

    avg() {
        return this._deriveAgg(v => getArrayStats(v).mean);
    }

    corr(other: any) {
        return this._deriveAggBinary(other, pairs => computeStatisticalMatrix(pairs)?.correlation ?? null);
    }

    count(options: { includeNulls?: boolean } = {}) {
        if (options.includeNulls) return this._deriveAgg(v => v.length);
        return this._deriveAgg(v => getArrayStats(v).count);
    }

    cov(other: any) {
        return this._deriveAggBinary(other, pairs => computeStatisticalMatrix(pairs)?.covariance ?? null);
    }

    dot(other: any) {
        return this._deriveAggBinary(other, pairs => computeDotProduct(pairs));
    }

    first() {
        return this._deriveAgg(v => v[0] ?? null);
    }

    implode() {
        return this._deriveAgg(v => v);
    }

    last() {
        return this._deriveAgg(v => v[v.length - 1] ?? null);
    }

    max() {
        return this._deriveAgg(v => getArrayStats(v).max);
    }

    mean() {
        return this.avg();
    }

    median() {
        return this._deriveAgg(v => computeMedian(v));
    }

    min() {
        return this._deriveAgg(v => getArrayStats(v).min);
    }

    mode() {
        return this._deriveAgg(v => computeMode(v));
    }

    n_unique(options: UniqueArrayStatsOptions = {}) {
        return this._deriveAgg(v => {
            return getUniqueArrayStats(v, options).count;
        });
    }

    null_count() {
        return this._deriveAgg(v => getArrayStats(v).nullCount);
    }

    quantile(q: number) {
        if (q < 0 || q > 1) throw new ComputeError("Quantile q must be between 0 and 1");
        return this._deriveAgg(v => computeQuantile(v, q));
    }

    spearman_corr(other: any) {
        return this._deriveAggBinary(other, pairs => computeSpearmanCorrelation(pairs));
    }

    std() {
        return this._deriveAgg(v => getArrayStats(v).std);
    }

    sum() {
        return this._deriveAgg(v => getArrayStats(v).sum);
    }

    w_avg(weights: any) {
        return this._deriveAggBinary(weights, pairs => computeWeightedAverage(pairs));
    }

}
