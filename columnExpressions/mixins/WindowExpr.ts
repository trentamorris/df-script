import type { IExpr, ExprConstructor } from "../../types"
import { derive } from "../ExprBase"

export const WindowExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        public partitionBy: (string | IExpr)[] | null = (this as any).partitionBy || null;

        _rolling(windowSize: number, aggFn: (vals: any[]) => any) {
            const newInst = derive(this, (v) => v);
            newInst.partitionOpsIndex = this.ops.length;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.evaluateWindow = function(this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) {
                const start = Math.max(0, currentIndex - windowSize + 1);
                const end = currentIndex + 1;
                const windowVals = groupPreValues.slice(start, end);
                return aggFn(windowVals);
            };
            return newInst;
        }

        get isWindow(): boolean {
            return this.partitionBy !== null || (this as any).evaluateWindow !== undefined || (this as any).aggFn !== null;
        }

        cum_count(reverse: boolean = false) {
            const newInst = derive(this, (v) => v);
            newInst.partitionOpsIndex = this.ops.length;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.evaluateWindow = function(this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) {
                let count = 0;
                const start = reverse ? currentIndex : 0;
                const end = reverse ? groupPreValues.length - 1 : currentIndex;
                for (let i = start; i <= end; i++) {
                    const val = groupPreValues[i];
                    if (val != null) count++;
                }
                return count;
            };
            return newInst;
        }

        cum_max(reverse: boolean = false) {
            const newInst = derive(this, (v) => v);
            newInst.partitionOpsIndex = this.ops.length;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.evaluateWindow = function(this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) {
                let maxVal = null;
                const start = reverse ? currentIndex : 0;
                const end = reverse ? groupPreValues.length - 1 : currentIndex;
                for (let i = start; i <= end; i++) {
                    const val = groupPreValues[i];
                    if (val != null) {
                        if (maxVal === null || val > maxVal) {
                            maxVal = val;
                        }
                    }
                }
                return maxVal;
            };
            return newInst;
        }

        cum_min(reverse: boolean = false) {
            const newInst = derive(this, (v) => v);
            newInst.partitionOpsIndex = this.ops.length;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.evaluateWindow = function(this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) {
                let minVal = null;
                const start = reverse ? currentIndex : 0;
                const end = reverse ? groupPreValues.length - 1 : currentIndex;
                for (let i = start; i <= end; i++) {
                    const val = groupPreValues[i];
                    if (val != null) {
                        if (minVal === null || val < minVal) {
                            minVal = val;
                        }
                    }
                }
                return minVal;
            };
            return newInst;
        }

        cum_prod(reverse: boolean = false) {
            const newInst = derive(this, (v) => v);
            newInst.partitionOpsIndex = this.ops.length;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.evaluateWindow = function(this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) {
                let prod = 1;
                let hasValid = false;
                const start = reverse ? currentIndex : 0;
                const end = reverse ? groupPreValues.length - 1 : currentIndex;
                for (let i = start; i <= end; i++) {
                    const val = groupPreValues[i];
                    if (val != null) {
                        prod *= val;
                        hasValid = true;
                    }
                }
                return hasValid ? prod : null;
            };
            return newInst;
        }

        cum_sum(reverse: boolean = false) {
            const newInst = derive(this, (v) => v);
            newInst.partitionOpsIndex = this.ops.length;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.evaluateWindow = function(this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) {
                let sum = 0;
                const start = reverse ? currentIndex : 0;
                const end = reverse ? groupPreValues.length - 1 : currentIndex;
                for (let i = start; i <= end; i++) {
                    const val = groupPreValues[i];
                    if (val != null) sum += val;
                }
                return sum;
            };
            return newInst;
        }

        dense_rank() {
            const newInst = derive(this, (v) => v);
            newInst.partitionOpsIndex = this.ops.length;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.evaluateWindow = function(this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) {
                const sortedUnique = Array.from(new Set(groupPreValues)).sort((a, b) => a - b);
                const valueToRank = new Map(sortedUnique.map((v, idx) => [v, idx + 1]));
                const currentVal = groupPreValues[currentIndex];
                return valueToRank.get(currentVal) ?? null;
            };
            return newInst;
        }

        lag(offset: number = 1, defaultVal: any = null) {
            const newInst = derive(this, (v) => v);
            newInst.partitionOpsIndex = this.ops.length;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.evaluateWindow = function(this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) {
                let val = defaultVal;
                if (currentIndex - offset >= 0) {
                    val = groupPreValues[currentIndex - offset];
                }
                return val;
            };
            return newInst;
        }

        lead(offset: number = 1, defaultVal: any = null) {
            const newInst = derive(this, (v) => v);
            newInst.partitionOpsIndex = this.ops.length;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.evaluateWindow = function(this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) {
                let val = defaultVal;
                if (currentIndex + offset < groupPreValues.length) {
                    val = groupPreValues[currentIndex + offset];
                }
                return val;
            };
            return newInst;
        }

        over(columns: string | IExpr | (string | IExpr)[]) {
            const newInst = derive(this, (v) => v);
            const cols = Array.isArray(columns) ? columns : [columns];
            newInst.partitionBy = cols;
            return newInst;
        }

        rank() {
            const newInst = derive(this, (v) => v);
            newInst.partitionOpsIndex = this.ops.length;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.evaluateWindow = function(this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) {
                const sorted = [...groupPreValues].sort((a, b) => a - b);
                const valueToRank = new Map();
                for (let i = 0; i < sorted.length; i++) {
                    const v = sorted[i];
                    if (!valueToRank.has(v)) {
                        valueToRank.set(v, i + 1);
                    }
                }
                const currentVal = groupPreValues[currentIndex];
                return valueToRank.get(currentVal) ?? null;
            };
            return newInst;
        }

        rolling_max(windowSize: number) {
            return this._rolling(windowSize, v => {
                const f = v.filter(x => x != null);
                return f.length ? f.reduce((a, b) => (a > b ? a : b)) : null;
            });
        }

        rolling_mean(windowSize: number) {
            return this._rolling(windowSize, v => {
                const f = v.filter(x => x != null);
                return f.length ? f.reduce((a, b) => a + b, 0) / f.length : null;
            });
        }

        rolling_median(windowSize: number) {
            return this._rolling(windowSize, v => {
                const f = v.filter(x => x != null).sort((a, b) => a - b);
                if (!f.length) return null;
                const mid = Math.floor(f.length / 2);
                return f.length % 2 !== 0 ? f[mid] : (f[mid - 1] + f[mid]) / 2;
            });
        }

        rolling_min(windowSize: number) {
            return this._rolling(windowSize, v => {
                const f = v.filter(x => x != null);
                return f.length ? f.reduce((a, b) => (a < b ? a : b)) : null;
            });
        }

        rolling_quantile(quantile: number, windowSize: number) {
            return this._rolling(windowSize, v => {
                const f = v.filter(x => x != null).sort((a, b) => a - b);
                const n = f.length;
                if (n === 0) return null;
                const idx = quantile * (n - 1);
                const low = Math.floor(idx);
                const high = Math.ceil(idx);
                if (low === high) return f[low];
                return f[low] + (idx - low) * (f[high] - f[low]);
            });
        }

        rolling_rank(windowSize: number) {
            const newInst = derive(this, (v) => v);
            newInst.partitionOpsIndex = this.ops.length;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.evaluateWindow = function(this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) {
                const start = Math.max(0, currentIndex - windowSize + 1);
                const end = currentIndex + 1;
                const vals = groupPreValues.slice(start, end);
                const currentVal = groupPreValues[currentIndex];
                if (currentVal == null) return null;
                const nonNullVals = vals.filter(x => x != null);
                if (nonNullVals.length === 0) return null;
                const sorted = [...nonNullVals].sort((a, b) => a - b);
                const valueToRank = new Map();
                for (let i = 0; i < sorted.length; i++) {
                    const v = sorted[i];
                    if (!valueToRank.has(v)) {
                        valueToRank.set(v, i + 1);
                    }
                }
                return valueToRank.get(currentVal) ?? null;
            };
            return newInst;
        }

        rolling_std(windowSize: number) {
            return this._rolling(windowSize, v => {
                const f = v.filter(x => x != null);
                if (f.length < 2) return 0;
                const mean = f.reduce((a, b) => a + b, 0) / f.length;
                const variance = f.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (f.length - 1);
                return Math.sqrt(variance);
            });
        }

        rolling_sum(windowSize: number) {
            return this._rolling(windowSize, v => {
                const f = v.filter(x => x != null);
                return f.length ? f.reduce((a, b) => a + b, 0) : null;
            });
        }

        row_number() {
            const newInst = derive(this, (v) => v);
            newInst.partitionOpsIndex = this.ops.length;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.evaluateWindow = function(this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) {
                return currentIndex + 1;
            };
            newInst.outputName = "row_number";
            return newInst;
        }
    }
}
