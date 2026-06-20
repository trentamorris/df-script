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
    public partitionBy: (string | IExpr)[] | null = (this as any).partitionBy || null;

    _window(evaluateWindow: (this: IExpr, groupPreValues: any[], partitionIndices: number[], currentIndex: number) => any) {
        const newInst = derive(this);
        newInst.partitionOpsIndex = this.ops.length;
        newInst.groupingOpsIndex = this.ops.length;
        newInst.evaluateWindow = evaluateWindow;
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

    get isWindow(): boolean {
        return this.partitionBy !== null || (this as any).evaluateWindow !== undefined || (this as any).aggFn !== null;
    }

    cum_count(reverse: boolean = false) {
        return this._cum(reverse, 0, (acc) => acc + 1);
    }

    cum_max(reverse: boolean = false) {
        return this._cum(reverse, null, (acc, val) => (acc === null || val > acc ? val : acc));
    }

    cum_min(reverse: boolean = false) {
        return this._cum(reverse, null, (acc, val) => (acc === null || val < acc ? val : acc));
    }

    cum_prod(reverse: boolean = false) {
        return this._cum(reverse, 1, (acc, val) => acc * val, (acc, hasValid) => (hasValid ? acc : null));
    }

    cum_sum(reverse: boolean = false) {
        return this._cum(reverse, 0, (acc, val) => acc + val);
    }

    dense_rank() {
        return this._window(function (this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
            return computeRank(groupPreValues, groupPreValues[currentIndex], { dense: true });
        });
    }

    lag(offset: number = 1, defaultVal: any = null) {
        return this._window(function (this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
            let val = defaultVal;
            if (currentIndex - offset >= 0) {
                val = groupPreValues[currentIndex - offset];
            }
            return val;
        });
    }

    lead(offset: number = 1, defaultVal: any = null) {
        return this._window(function (this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
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
        return this._window(function (this: IExpr, groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
            return computeRank(groupPreValues, groupPreValues[currentIndex]);
        });
    }

    rolling_max(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).max);
    }

    rolling_mean(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).mean);
    }

    rolling_median(windowSize: number) {
        return this._rolling(windowSize, v => computeMedian(v));
    }

    rolling_min(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).min);
    }

    rolling_quantile(quantile: number, windowSize: number) {
        return this._rolling(windowSize, v => computeQuantile(v, quantile));
    }

    rolling_rank(windowSize: number) {
        return this._rolling(windowSize, (vals) => {
            return computeRank(vals, vals[vals.length - 1], { ignoreNulls: true });
        });
    }

    rolling_std(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).std);
    }

    rolling_sum(windowSize: number) {
        return this._rolling(windowSize, v => getArrayStats(v).sum);
    }

    row_number() {
        const newInst = this._window(function (this: IExpr, _groupPreValues: any[], _partitionIndices: number[], currentIndex: number) {
            return currentIndex + 1;
        });
        newInst.outputName = "row_number";
        return newInst;
    }
}
