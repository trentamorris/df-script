import type { IExpr } from "../../types"
import { ExprBase, derive } from "../ExprBase"
import { getArrayStats, computeMedian, computeQuantile, sortArray } from "../../utils"

function computeRank(
    arr: any[],
    value: any,
    options: { ignoreNulls?: boolean; dense?: boolean } = {}
): number | null {
    if (value == null) return null;

    const cacheKey = options.dense ? "_denseRankCache" : "_rankCache";
    let valueToRank = (arr as any)[cacheKey];

    if (!valueToRank) {
        let targetArr = arr;
        if (options.ignoreNulls) {
            targetArr = [];
            const len = arr.length;
            for (let i = 0; i < len; i++) {
                if (arr[i] != null) targetArr.push(arr[i]);
            }
        }
        if (options.dense) {
            targetArr = Array.from(new Set(targetArr));
        }

        const sorted = sortArray(targetArr);
        valueToRank = new Map();
        const len = sorted.length;
        for (let i = 0; i < len; i++) {
            const v = sorted[i];
            if (!valueToRank.has(v)) {
                valueToRank.set(v, i + 1);
            }
        }
        (arr as any)[cacheKey] = valueToRank;
    }

    return valueToRank.get(value) ?? null;
}


export class WindowExpr extends ExprBase {
    public _partitionBy: (string | IExpr)[] | null = (this as any)._partitionBy || null;

    _window(evaluateWindow: (this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) => any) {
        const newInst = derive(this);
        newInst._partitionOpsIndex = this._ops.length;
        newInst._groupingOpsIndex = this._ops.length;
        newInst._evaluateWindow = evaluateWindow;
        return newInst;
    }

    _rolling(windowSize: number, aggFn: (vals: any[]) => any) {
        return this._window(function (this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
            const start = Math.max(0, currentIndex - windowSize + 1);
            const end = currentIndex + 1;
            const windowVals = groupPreValues.slice(start, end);
            return aggFn(windowVals);
        });
    }

    _cum(
        reverse: boolean,
        initialVal: any,
        stepFn: (acc: any, val: any) => any,
        postFn?: (acc: any, hasValid: boolean) => any
    ) {
        return this._window(function (this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
            let acc = initialVal;
            let hasValid = false;
            const start = reverse ? currentIndex : 0;
            const end = reverse ? groupPreValues.length - 1 : currentIndex;
            for (let i = start; i <= end; i++) {
                const val = groupPreValues[i];
                if (val != null) {
                    acc = stepFn(acc, val);
                    hasValid = true;
                }
            }
            return postFn ? postFn(acc, hasValid) : acc;
        });
    }

    get _isWindow(): boolean {
        return this._partitionBy !== null || (this as any)._evaluateWindow !== undefined || (this as any)._aggFn !== null;
    }

    /**
     * Window: Computes cumulative count.
     * @since v1.7.0
     */
    cum_count(reverse: boolean = false) {
        return this._cum(reverse, 0, (acc) => acc + 1);
    }

    /**
     * Window: Computes cumulative max.
     * @since v1.7.0
     */
    cum_max(reverse: boolean = false) {
        return this._cum(reverse, null, (acc, val) => (acc === null || val > acc ? val : acc));
    }

    /**
     * Window: Computes cumulative min.
     * @since v1.7.0
     */
    cum_min(reverse: boolean = false) {
        return this._cum(reverse, null, (acc, val) => (acc === null || val < acc ? val : acc));
    }

    /**
     * Window: Computes cumulative product.
     * @since v1.7.0
     */
    cum_prod(reverse: boolean = false) {
        return this._cum(reverse, 1, (acc, val) => acc * val, (acc, hasValid) => (hasValid ? acc : null));
    }

    /**
     * Window: Computes cumulative sum.
     * @since v1.7.0
     */
    cum_sum(reverse: boolean = false) {
        return this._cum(reverse, 0, (acc, val) => acc + val);
    }

    /**
     * Window: Computes dense rank within group partition.
     * @since v1.7.0
     */
    dense_rank() {
        return this._window(function (this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
            return computeRank(groupPreValues, groupPreValues[currentIndex], { dense: true });
        });
    }

    /**
     * Window: Shifts values down by offset, filling with default.
     * @since v1.7.0
     */
    lag(offset: number = 1, defaultVal: any = null) {
        return this._window(function (this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
            let val = defaultVal;
            if (currentIndex - offset >= 0) {
                val = groupPreValues[currentIndex - offset];
            }
            return val;
        });
    }

    /**
     * Window: Shifts values up by offset, filling with default.
     * @since v1.7.0
     */
    lead(offset: number = 1, defaultVal: any = null) {
        return this._window(function (this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
            let val = defaultVal;
            if (currentIndex + offset < groupPreValues.length) {
                val = groupPreValues[currentIndex + offset];
            }
            return val;
        });
    }

    /**
     * Executes a window aggregation partitioned by column keys.
     * @since v1.7.0
     */
    over(columns: string | IExpr | (string | IExpr)[]) {
        const newInst = derive(this);
        const cols = Array.isArray(columns) ? columns : [columns];
        newInst._partitionBy = cols;
        return newInst;
    }

    /**
     * Window: Computes rank within group partition.
     * @since v1.7.0
     */
    rank() {
        return this._window(function (this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
            return computeRank(groupPreValues, groupPreValues[currentIndex]);
        });
    }

    /**
     * Window: Computes rolling window max.
     * @since v1.7.0
     */
    rolling_max(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).max);
    }

    /**
     * Window: Computes rolling window mean.
     * @since v1.7.0
     */
    rolling_mean(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).mean);
    }

    /**
     * Window: Computes rolling window median.
     * @since v1.7.0
     */
    rolling_median(windowSize: number) {
        return this._rolling(windowSize, v => computeMedian(v));
    }

    /**
     * Window: Computes rolling window min.
     * @since v1.7.0
     */
    rolling_min(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).min);
    }

    /**
     * Window: Computes rolling window quantile value.
     * @since v1.7.0
     */
    rolling_quantile(quantile: number, windowSize: number) {
        return this._rolling(windowSize, v => computeQuantile(v, quantile));
    }

    /**
     * Window: Computes rolling window rank.
     * @since v1.7.0
     */
    rolling_rank(windowSize: number) {
        return this._rolling(windowSize, (vals) => {
            return computeRank(vals, vals[vals.length - 1], { ignoreNulls: true });
        });
    }

    /**
     * Window: Computes rolling window standard deviation.
     * @since v1.7.0
     */
    rolling_std(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).std);
    }

    /**
     * Window: Computes rolling window sum.
     * @since v1.7.0
     */
    rolling_sum(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).sum);
    }

    /**
     * Window: Computes row index count within group partitions.
     * @since v1.7.0
     */
    row_number() {
        const newInst = this._window(function (this: IExpr, _groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
            return currentIndex + 1;
        });
        newInst._outputName = "row_number";
        return newInst;
    }
}
