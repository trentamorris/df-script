import type { IExpr } from "../../types"
import type { ExprConstructor } from "../types"
import { derive } from "../ExprBase"
import { getListStats, computeMedian, computeQuantile } from "../../utils"

export const WindowExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        public partitionBy: (string | IExpr)[] | null = (this as any).partitionBy || null;

        _window(evaluateWindow: (this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) => any) {
            const newInst = derive(this);
            newInst.partitionOpsIndex = this.ops.length;
            newInst.groupingOpsIndex = this.ops.length;
            newInst.evaluateWindow = evaluateWindow;
            return newInst;
        }

        _rolling(windowSize: number, aggFn: (vals: any[]) => any) {
            return this._window(function(this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
                const start = Math.max(0, currentIndex - windowSize + 1);
                const end = currentIndex + 1;
                const windowVals = groupPreValues.slice(start, end);
                return aggFn(windowVals);
            });
        }

        get isWindow(): boolean {
            return this.partitionBy !== null || (this as any).evaluateWindow !== undefined || (this as any).aggFn !== null;
        }

        cum_count(reverse: boolean = false) {
            return this._window(function(this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
                let count = 0;
                const start = reverse ? currentIndex : 0;
                const end = reverse ? groupPreValues.length - 1 : currentIndex;
                for (let i = start; i <= end; i++) {
                    const val = groupPreValues[i];
                    if (val != null) count++;
                }
                return count;
            });
        }

        cum_max(reverse: boolean = false) {
            return this._window(function(this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
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
            });
        }

        cum_min(reverse: boolean = false) {
            return this._window(function(this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
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
            });
        }

        cum_prod(reverse: boolean = false) {
            return this._window(function(this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
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
            });
        }

        cum_sum(reverse: boolean = false) {
            return this._window(function(this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
                let sum = 0;
                const start = reverse ? currentIndex : 0;
                const end = reverse ? groupPreValues.length - 1 : currentIndex;
                for (let i = start; i <= end; i++) {
                    const val = groupPreValues[i];
                    if (val != null) sum += val;
                }
                return sum;
            });
        }

        dense_rank() {
            return this._window(function(this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
                const sortedUnique = Array.from(new Set(groupPreValues)).sort((a, b) => a - b);
                const valueToRank = new Map();
                for (let idx = 0; idx < sortedUnique.length; idx++) {
                    valueToRank.set(sortedUnique[idx], idx + 1);
                }
                const currentVal = groupPreValues[currentIndex];
                return valueToRank.get(currentVal) ?? null;
            });
        }

        lag(offset: number = 1, defaultVal: any = null) {
            return this._window(function(this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
                let val = defaultVal;
                if (currentIndex - offset >= 0) {
                    val = groupPreValues[currentIndex - offset];
                }
                return val;
            });
        }

        lead(offset: number = 1, defaultVal: any = null) {
            return this._window(function(this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
                let val = defaultVal;
                if (currentIndex + offset < groupPreValues.length) {
                    val = groupPreValues[currentIndex + offset];
                }
                return val;
            });
        }

        over(columns: string | IExpr | (string | IExpr)[]) {
            const newInst = derive(this);
            const cols = Array.isArray(columns) ? columns : [columns];
            newInst.partitionBy = cols;
            return newInst;
        }

        rank() {
            return this._window(function(this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
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
            });
        }

        rolling_max(windowSize: number) {
            return this._rolling(windowSize, v => getListStats(v).max);
        }

        rolling_mean(windowSize: number) {
            return this._rolling(windowSize, v => getListStats(v).mean);
        }

        rolling_median(windowSize: number) {
            return this._rolling(windowSize, v => computeMedian(v));
        }

        rolling_min(windowSize: number) {
            return this._rolling(windowSize, v => getListStats(v).min);
        }

        rolling_quantile(quantile: number, windowSize: number) {
            return this._rolling(windowSize, v => computeQuantile(v, quantile));
        }

        rolling_rank(windowSize: number) {
            return this._window(function(this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
                const start = Math.max(0, currentIndex - windowSize + 1);
                const end = currentIndex + 1;
                const vals = groupPreValues.slice(start, end);
                const currentVal = groupPreValues[currentIndex];
                if (currentVal == null) return null;
                const nonNullVals: any[] = [];
                for (let j = 0; j < vals.length; j++) {
                    if (vals[j] != null) nonNullVals.push(vals[j]);
                }
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
            });
        }

        rolling_std(windowSize: number) {
            return this._rolling(windowSize, v => getListStats(v).std);
        }

        rolling_sum(windowSize: number) {
            return this._rolling(windowSize, v => getListStats(v).sum);
        }

        row_number() {
            const newInst = this._window(function(this: IExpr, _groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
                return currentIndex + 1;
            });
            newInst.outputName = "row_number";
            return newInst;
        }
    }
}
