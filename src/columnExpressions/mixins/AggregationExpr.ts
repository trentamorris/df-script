import type { AggFn, UniqueListStatsOptions } from "../../types"
import { ExprBase, derive } from "../ExprBase"
import { ComputeError } from "../../exceptions"
import { getListStats, computeMedian, computeQuantile, getUniqueListStats, computeMode, isArrayOfType } from "../../utils"



export class AggregationExpr extends ExprBase {

        _deriveAgg(fn: AggFn<any>) {
            const newInst = derive(this);
            newInst.aggFn = fn;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.partitionOpsIndex = this.ops.length;
            return newInst;
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
            return this._deriveAgg(v => getListStats(v).mean);
        }

        count(options: { includeNulls?: boolean } = {}) {
            if (options.includeNulls) return this._deriveAgg(v => v.length);
            return this._deriveAgg(v => getListStats(v).count);
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
            return this._deriveAgg(v => getListStats(v).max);
        }

        mean() {
            return this.avg();
        }

        median() {
            return this._deriveAgg(v => computeMedian(v));
        }

        min() {
            return this._deriveAgg(v => getListStats(v).min);
        }

        mode() {
            return this._deriveAgg(v => computeMode(v));
        }

        n_unique(options: UniqueListStatsOptions = {}) {
            return this._deriveAgg(v => {
                return getUniqueListStats(v, options).count;
            });
        }

        quantile(q: number) {
            if (q < 0 || q > 1) throw new ComputeError("Quantile q must be between 0 and 1");
            return this._deriveAgg(v => computeQuantile(v, q));
        }

        std() {
            return this._deriveAgg(v => getListStats(v).std);
        }

        sum() {
            return this._deriveAgg(v => getListStats(v).sum);
        }

}
