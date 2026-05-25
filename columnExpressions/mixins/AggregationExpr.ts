import type { AggFn, ExprConstructor } from "../../types"
import { derive } from "../ExprBase"

export const AggregationExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        public aggFn: AggFn<any> | null = (this as any).aggFn || null;
        private _setAgg(fn: AggFn<any>) {
            const newInst = derive(this, (v) => v);
            newInst.aggFn = fn;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.partitionOpsIndex = this.ops.length;
            return newInst;
        }

        sum() { 
            return this._setAgg(v => {
                const f = v.filter(x => x != null);
                return f.length ? f.reduce((a, b) => a + b, 0) : null;
            });
        }
        avg() { 
            return this._setAgg(v => {
                const f = v.filter(x => x != null);
                return f.length ? f.reduce((a, b) => a + b, 0) / f.length : null;
            }); 
        }
        min() {
            return this._setAgg(v => {
                const f = v.filter(x => x != null);
                return f.length ? f.reduce((a, b) => (a < b ? a : b)) : null;
            });
        }
        max() {
            return this._setAgg(v => {
                const f = v.filter(x => x != null);
                return f.length ? f.reduce((a, b) => (a > b ? a : b)) : null;
            });
        }
        mean() {
            return this.avg();
        }
        median() {
            return this._setAgg(v => {
                const f = v.filter(x => x != null).sort((a, b) => a - b)
                const fLen = f.length
                if (!fLen) return null
                const mid = Math.floor(fLen / 2)
                return fLen % 2 !== 0 ? f[mid] : (f[mid - 1] + f[mid]) / 2;
            })
        }
        mode() {
            return this._setAgg(v => {
                const f = v.filter(x => x != null);
                const fLen = f.length;
                if (!fLen) return null;
                const counts = new Map();
                let maxCount = 0;
                let modeVal = f[0];
                for (const val of f) {
                    const count = (counts.get(val) || 0) + 1;
                    counts.set(val, count)
                    if (count > maxCount) {
                        maxCount = count;
                        modeVal = val;
                    }
                }
                return modeVal
            })
        }
        std() {
            return this._setAgg(v => {
                const f = v.filter(x => x != null);
                const fLen = f.length
                if (fLen < 2) return 0;
                const mean = f.reduce((a, b) => a + b, 0) / fLen;
                const variance = f.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (fLen - 1);
                return Math.sqrt(variance)
            })
        }
        count() { 
            return this._setAgg(v => v.length); 
        }
        uniqueCount() {
            return this._setAgg(v => new Set(v).size)
        }
        first() {
            return this._setAgg(v => v[0])
        }
        last() {
            return this._setAgg(v => v[v.length - 1])
        }
        any() {
            return this._setAgg(v => v.some(x => !!x));
        }
        all() {
            return this._setAgg(v => v.every(x => !!x));
        }
        any_null() {
            return this._setAgg(v => v.some(x => x === null));
        }
        all_null() {
            return this._setAgg(v => v.every(x => x == null));
        }
    }
}
