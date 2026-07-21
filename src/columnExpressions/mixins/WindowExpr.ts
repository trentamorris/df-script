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
     * @param reverse Flag indicating whether to compute from reverse direction.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [10, 20, 30] })
     * >>> df.with_columns($df.col("val").cum_count().alias("c_count"))
     * shape: (3, 2)
     * ┌─────┬─────────┐
     * │ val │ c_count │
     * ├─────┼─────────┤
     * │ 10  │ 1       │
     * │ 20  │ 2       │
     * │ 30  │ 3       │
     * └─────┴─────────┘
     * @since v1.7.0
     */
    cum_count(reverse: boolean = false) {
        return this._cum(reverse, 0, (acc) => acc + 1);
    }

    /**
     * Window: Computes cumulative maximum value.
     * @param reverse Flag indicating whether to compute in reverse direction.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [1, 3, 2] })
     * >>> df.with_columns($df.col("val").cum_max().alias("c_max"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ c_max │
     * ├─────┼───────┤
     * │ 1   │ 1     │
     * │ 3   │ 3     │
     * │ 2   │ 3     │
     * └─────┴───────┘
     * @since v1.7.0
     */
    cum_max(reverse: boolean = false) {
        return this._cum(reverse, null, (acc, val) => (acc === null || val > acc ? val : acc));
    }

    /**
     * Window: Computes cumulative minimum value.
     * @param reverse Flag indicating whether to compute in reverse direction.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [3, 1, 2] })
     * >>> df.with_columns($df.col("val").cum_min().alias("c_min"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ c_min │
     * ├─────┼───────┤
     * │ 3   │ 3     │
     * │ 1   │ 1     │
     * │ 2   │ 1     │
     * └─────┴───────┘
     * @since v1.7.0
     */
    cum_min(reverse: boolean = false) {
        return this._cum(reverse, null, (acc, val) => (acc === null || val < acc ? val : acc));
    }

    /**
     * Window: Computes cumulative product of values.
     * @param reverse Flag indicating whether to compute in reverse direction.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [1, 2, 3, 4] })
     * >>> df.with_columns($df.col("val").cum_prod().alias("c_prod"))
     * shape: (4, 2)
     * ┌─────┬────────┐
     * │ val │ c_prod │
     * ├─────┼────────┤
     * │ 1   │ 1      │
     * │ 2   │ 2      │
     * │ 3   │ 6      │
     * │ 4   │ 24     │
     * └─────┴────────┘
     * @since v1.7.0
     */
    cum_prod(reverse: boolean = false) {
        return this._cum(reverse, 1, (acc, val) => acc * val, (acc, hasValid) => (hasValid ? acc : null));
    }

    /**
     * Window: Computes cumulative sum of values.
     * @param reverse Flag indicating whether to compute in reverse direction.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [10, 20, 30] })
     * >>> df.with_columns($df.col("val").cum_sum().alias("c_sum"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ c_sum │
     * ├─────┼───────┤
     * │ 10  │ 10    │
     * │ 20  │ 30    │
     * │ 30  │ 60    │
     * └─────┴───────┘
     * @since v1.7.0
     */
    cum_sum(reverse: boolean = false) {
        return this._cum(reverse, 0, (acc, val) => acc + val);
    }

    /**
     * Window: Computes dense rank (ranks without gaps) within group partition.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ score: [100, 100, 90] })
     * >>> df.with_columns($df.col("score").dense_rank().alias("dr"))
     * shape: (3, 2)
     * ┌───────┬────┐
     * │ score │ dr │
     * ├───────┼────┤
     * │ 100   │ 2  │
     * │ 100   │ 2  │
     * │ 90    │ 1  │
     * └───────┴────┘
     * @since v1.7.0
     */
    dense_rank() {
        return this._window(function (this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
            return computeRank(groupPreValues, groupPreValues[currentIndex], { dense: true });
        });
    }

    /**
     * Window: Shifts values down by offset, filling missing slots with default value.
     * @param offset Number of rows to shift down (default 1).
     * @param defaultVal Fallback fill value for empty slots (default null).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [10, 20, 30] })
     * >>> df.with_columns($df.col("val").lag(1, 0).alias("prev"))
     * shape: (3, 2)
     * ┌─────┬──────┐
     * │ val │ prev │
     * ├─────┼──────┤
     * │ 10  │ 0    │
     * │ 20  │ 10   │
     * │ 30  │ 20   │
     * └─────┴──────┘
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
     * Window: Shifts values up by offset, filling missing slots with default value.
     * @param offset Number of rows to shift up (default 1).
     * @param defaultVal Fallback fill value for empty slots (default null).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [10, 20, 30] })
     * >>> df.with_columns($df.col("val").lead(1, 0).alias("next"))
     * shape: (3, 2)
     * ┌─────┬──────┐
     * │ val │ next │
     * ├─────┼──────┤
     * │ 10  │ 20   │
     * │ 20  │ 30   │
     * │ 30  │ 0    │
     * └─────┴──────┘
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
     * @param columns Column expression or array of columns to partition by.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ cat: ["A", "A", "B"], val: [10, 20, 30] })
     * >>> df.with_columns($df.col("val").sum().over("cat").alias("cat_sum"))
     * shape: (3, 3)
     * ┌─────┬─────┬─────────┐
     * │ cat │ val │ cat_sum │
     * ├─────┼─────┼─────────┤
     * │ A   │ 10  │ 30      │
     * │ A   │ 20  │ 30      │
     * │ B   │ 30  │ 30      │
     * └─────┴─────┴─────────┘
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
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ score: [100, 80, 90] })
     * >>> df.with_columns($df.col("score").rank().alias("rank"))
     * shape: (3, 2)
     * ┌───────┬──────┐
     * │ score │ rank │
     * ├───────┼──────┤
     * │ 100   │ 3    │
     * │ 80    │ 1    │
     * │ 90    │ 2    │
     * └───────┴──────┘
     * @since v1.7.0
     */
    rank() {
        return this._window(function (this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
            return computeRank(groupPreValues, groupPreValues[currentIndex]);
        });
    }

    /**
     * Window: Computes rolling window maximum value.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [1, 5, 2, 8] })
     * >>> df.with_columns($df.col("val").rolling_max(2).alias("r_max"))
     * shape: (4, 2)
     * ┌─────┬───────┐
     * │ val │ r_max │
     * ├─────┼───────┤
     * │ 1   │ 1     │
     * │ 5   │ 5     │
     * │ 2   │ 5     │
     * │ 8   │ 8     │
     * └─────┴───────┘
     * @since v1.7.0
     */
    rolling_max(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).max);
    }

    /**
     * Window: Computes rolling window mean average.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [10, 20, 30] })
     * >>> df.with_columns($df.col("val").rolling_mean(2).alias("r_mean"))
     * shape: (3, 2)
     * ┌─────┬────────┐
     * │ val │ r_mean │
     * ├─────┼────────┤
     * │ 10  │ 10     │
     * │ 20  │ 15     │
     * │ 30  │ 25     │
     * └─────┴────────┘
     * @since v1.7.0
     */
    rolling_mean(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).mean);
    }

    /**
     * Window: Computes rolling window median value.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [10, 30, 20] })
     * >>> df.with_columns($df.col("val").rolling_median(2).alias("r_med"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ r_med │
     * ├─────┼───────┤
     * │ 10  │ 10    │
     * │ 30  │ 20    │
     * │ 20  │ 25    │
     * └─────┴───────┘
     * @since v1.7.0
     */
    rolling_median(windowSize: number) {
        return this._rolling(windowSize, v => computeMedian(v));
    }

    /**
     * Window: Computes rolling window minimum value.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [10, 5, 20] })
     * >>> df.with_columns($df.col("val").rolling_min(2).alias("r_min"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ r_min │
     * ├─────┼───────┤
     * │ 10  │ 10    │
     * │ 5   │ 5     │
     * │ 20  │ 5     │
     * └─────┴───────┘
     * @since v1.7.0
     */
    rolling_min(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).min);
    }

    /**
     * Window: Computes rolling window quantile value.
     * @param quantile Quantile boundary between 0.0 and 1.0.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [10, 20, 30] })
     * >>> df.with_columns($df.col("val").rolling_quantile(0.5, 2).alias("r_quant"))
     * shape: (3, 2)
     * ┌─────┬─────────┐
     * │ val │ r_quant │
     * ├─────┼─────────┤
     * │ 10  │ 10      │
     * │ 20  │ 15      │
     * │ 30  │ 25      │
     * └─────┴─────────┘
     * @since v1.7.0
     */
    rolling_quantile(quantile: number, windowSize: number) {
        return this._rolling(windowSize, v => computeQuantile(v, quantile));
    }

    /**
     * Window: Computes rolling window rank.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [10, 20, 15] })
     * >>> df.with_columns($df.col("val").rolling_rank(2).alias("r_rank"))
     * shape: (3, 2)
     * ┌─────┬────────┐
     * │ val │ r_rank │
     * ├─────┼────────┤
     * │ 10  │ 1      │
     * │ 20  │ 2      │
     * │ 15  │ 1      │
     * └─────┴────────┘
     * @since v1.7.0
     */
    rolling_rank(windowSize: number) {
        return this._rolling(windowSize, (vals) => {
            return computeRank(vals, vals[vals.length - 1], { ignoreNulls: true });
        });
    }

    /**
     * Window: Computes rolling window standard deviation.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [10, 20, 30] })
     * >>> df.with_columns($df.col("val").rolling_std(2).alias("r_std"))
     * shape: (3, 2)
     * ┌─────┬────────┐
     * │ val │ r_std  │
     * ├─────┼────────┤
     * │ 10  │ 0      │
     * │ 20  │ 7.071  │
     * │ 30  │ 7.071  │
     * └─────┴────────┘
     * @since v1.7.0
     */
    rolling_std(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).std);
    }

    /**
     * Window: Computes rolling window sum.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: [10, 20, 30] })
     * >>> df.with_columns($df.col("val").rolling_sum(2).alias("r_sum"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ r_sum │
     * ├─────┼───────┤
     * │ 10  │ 10    │
     * │ 20  │ 30    │
     * │ 30  │ 50    │
     * └─────┴───────┘
     * @since v1.7.0
     */
    rolling_sum(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).sum);
    }

    /**
     * Window: Computes 1-indexed row number count within group partitions.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ cat: ["A", "A", "B"] })
     * >>> df.with_columns($df.col("cat").row_number().over("cat").alias("rn"))
     * shape: (3, 2)
     * ┌─────┬────┐
     * │ cat │ rn │
     * ├─────┼────┤
     * │ A   │ 1  │
     * │ A   │ 2  │
     * │ B   │ 1  │
     * └─────┴────┘
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
