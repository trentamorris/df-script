import type { AggFn } from "../../types"
import type { ExprConstructor } from "../types"
import { derive } from "../ExprBase"
import { ComputeError } from "../../exceptions"
import { getListStats, isArrayOrTypedArray, computeMedian, computeQuantile } from "../../utils"

export const AggregationExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        public aggFn: AggFn<any> | null = (this as any).aggFn || null;

        _deriveAgg(fn: AggFn<any>) {
            const newInst = derive(this);
            newInst.aggFn = fn;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.partitionOpsIndex = this.ops.length;
            return newInst;
        }

        all() {
            return this._deriveAgg(v => {
                for (let i = 0; i < v.length; i++) {
                    if (!v[i]) return false;
                }
                return true;
            });
        }

        all_null() {
            return this._deriveAgg(v => {
                for (let i = 0; i < v.length; i++) {
                    if (v[i] != null) return false;
                }
                return true;
            });
        }

        any() {
            return this._deriveAgg(v => {
                for (let i = 0; i < v.length; i++) {
                    if (v[i]) return true;
                }
                return false;
            });
        }

        any_null() {
            return this._deriveAgg(v => {
                for (let i = 0; i < v.length; i++) {
                    if (v[i] == null) return true;
                }
                return false;
            });
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
            return this._deriveAgg(v => {
                if (!isArrayOrTypedArray(v)) return null;
                const len = (v as any).length;

                const counts = new Map<any, number>();
                let maxCount = 0;

                for (let i = 0; i < len; i++) {
                    const val = (v as any)[i];
                    if (val == null) continue;
                    const c = (counts.get(val) ?? 0) + 1;
                    counts.set(val, c);
                    if (c > maxCount) maxCount = c;
                }

                if (maxCount === 0) return null;

                const modes: any[] = [];
                for (const [val, c] of counts.entries()) {
                    if (c === maxCount) {
                        modes.push(val);
                    }
                }

                if (modes.length === 0) return null;

                modes.sort((a, b) => {
                    if (a == null && b == null) return 0;
                    if (a == null) return 1;
                    if (b == null) return -1;
                    if (a < b) return -1;
                    if (a > b) return 1;
                    return 0;
                });

                return modes[0];
            });
        }

        n_unique() {
            return this._deriveAgg(v => new Set(v).size);
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
}
