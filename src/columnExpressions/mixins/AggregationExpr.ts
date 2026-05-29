import type { AggFn } from "../../types"
import type { ExprConstructor } from "../types"
import { derive } from "../ExprBase"

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
            return this._deriveAgg(v => {
                let sum = 0, count = 0;
                for (let i = 0; i < v.length; i++) {
                    if (v[i] != null) { sum += v[i]; count++; }
                }
                return count ? sum / count : null;
            });
        }

        count(options: { includeNulls?: boolean } = {}) {
            if (options.includeNulls) return this._deriveAgg(v => v.length);
            return this._deriveAgg(v => {
                let count = 0;
                for (let i = 0; i < v.length; i++) {
                    if (v[i] != null) count++;
                }
                return count;
            });
        }

        first() {
            return this._deriveAgg(v => v[0] ?? null);
        }

        last() {
            return this._deriveAgg(v => v[v.length - 1] ?? null);
        }

        max() {
            return this._deriveAgg(v => {
                let result = null;
                for (let i = 0; i < v.length; i++) {
                    if (v[i] != null && (result === null || v[i] > result)) result = v[i];
                }
                return result;
            });
        }

        mean() {
            return this.avg();
        }

        median() {
            return this._deriveAgg(v => {
                const f: any[] = [];
                for (let i = 0; i < v.length; i++) {
                    if (v[i] != null) f.push(v[i]);
                }
                const fLen = f.length;
                if (!fLen) return null;
                f.sort((a, b) => a - b);
                const mid = Math.floor(fLen / 2);
                return fLen % 2 !== 0 ? f[mid] : (f[mid - 1] + f[mid]) / 2;
            });
        }

        min() {
            return this._deriveAgg(v => {
                let result = null;
                for (let i = 0; i < v.length; i++) {
                    if (v[i] != null && (result === null || v[i] < result)) result = v[i];
                }
                return result;
            });
        }

        mode() {
            return this._deriveAgg(v => {
                const counts = new Map();
                let maxCount = 0;
                let modeVal = null;
                for (let i = 0; i < v.length; i++) {
                    const val = v[i];
                    if (val == null) continue;
                    const count = (counts.get(val) || 0) + 1;
                    counts.set(val, count);
                    if (count > maxCount) { maxCount = count; modeVal = val; }
                }
                return modeVal;
            });
        }

        quantile(q: number) {
            if (q < 0 || q > 1) throw new Error("Quantile q must be between 0 and 1");
            return this._deriveAgg(v => {
                const f: any[] = [];
                for (let i = 0; i < v.length; i++) {
                    if (v[i] != null) f.push(v[i]);
                }
                const fLen = f.length;
                if (!fLen) return null;
                f.sort((a, b) => a - b);
                const idx = (fLen - 1) * q;
                const low = Math.floor(idx);
                const high = Math.ceil(idx);
                if (low === high) return f[low];
                return f[low] + (idx - low) * (f[high] - f[low]);
            });
        }

        std() {
            return this._deriveAgg(v => {
                let sum = 0, count = 0;
                for (let i = 0; i < v.length; i++) {
                    if (v[i] != null) { sum += v[i]; count++; }
                }
                if (count < 2) return 0;
                const mean = sum / count;
                let variance = 0;
                for (let i = 0; i < v.length; i++) {
                    if (v[i] != null) variance += (v[i] - mean) ** 2;
                }
                return Math.sqrt(variance / (count - 1));
            });
        }

        sum() {
            return this._deriveAgg(v => {
                let total = null;
                for (let i = 0; i < v.length; i++) {
                    if (v[i] != null) total = (total ?? 0) + v[i];
                }
                return total;
            });
        }

        uniqueCount() {
            return this._deriveAgg(v => new Set(v).size);
        }

        n_unique() {
            return this.uniqueCount();
        }
    }
}
