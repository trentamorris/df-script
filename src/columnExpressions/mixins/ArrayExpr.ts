import { ExprBase, derive } from "../ExprBase";
import { kleeneUnary, evaluateExpression } from "../utils";
import { isArrayOrTypedArray, getArrayStats, sortArray, SortArrayOptions, computeMedian, getUniqueArrayStats, computeMode, isArrayOfType, stepSliceArray, StepSliceArrayOptions, joinArray } from "../../utils";
import { ComputeError } from "../../exceptions";
import type { UniqueArrayStatsOptions, JoinArrayOptions, ExplodeOptions, IExpr } from "../../types";
import { ELEMENT_MARKER } from "../constants";

export class ArrayExprNamespace {
    constructor(public expr: any) { }

    _deriveArray(fn: (arr: any[] | ArrayBufferView) => any) {
        return derive(this.expr, kleeneUnary((v) => {
            return isArrayOrTypedArray(v) ? fn(v as any) : null;
        }));
    }

    all() {
        return this._deriveArray((arr) => isArrayOfType(arr, (x) => !!x, { mode: "every" }));
    }

    any() {
        return this._deriveArray((arr) => isArrayOfType(arr, (x) => !!x, { mode: "some" }));
    }

    contains(item: any) {
        return this._deriveArray((arr: any) => arr.includes(item));
    }

    contains_all(items: ArrayLike<any>) {
        return this._deriveArray((arr: any) => isArrayOfType(items, (x) => arr.includes(x), { mode: "every" }));
    }

    contains_any(items: ArrayLike<any>) {
        return this._deriveArray((arr: any) => isArrayOfType(items, (x) => arr.includes(x), { mode: "some" }));
    }

    count_matches(item: any) {
        return this._deriveArray((arr: any) => {
            let count = 0;
            const len = arr.length;
            for (let i = 0; i < len; i++) {
                if (arr[i] === item) {
                    count++;
                }
            }
            return count;
        });
    }

    drop_nulls() {
        return this._deriveArray((arr: any) => {
            const len = arr.length;
            const result: any[] = [];
            for (let i = 0; i < len; i++) {
                if (arr[i] != null) result.push(arr[i]);
            }
            return result;
        });
    }

    explode({ empty_as_null = true, keep_nulls = true }: ExplodeOptions = {}) {
        return derive(this.expr, (vArray) => {
            const height = vArray.length;
            let newHeight = 0;
            for (let i = 0; i < height; i++) {
                const val = vArray[i];
                if (isArrayOrTypedArray(val)) {
                    newHeight += val.length || (empty_as_null ? 1 : 0);
                    continue;
                }

                if (val != null) {
                    newHeight += 1;
                    continue;
                }

                if (keep_nulls) {
                    newHeight += 1;
                }
            }

            const res = new Array(newHeight);
            const rowMap = new Int32Array(newHeight);
            let idx = 0;
            for (let i = 0; i < height; i++) {
                const val = vArray[i];
                if (isArrayOrTypedArray(val)) {
                    const len = val.length;
                    if (len > 0) {
                        for (let j = 0; j < len; j++) {
                            rowMap[idx] = i;
                            res[idx++] = val[j];
                        }
                        continue;
                    }
                    if (empty_as_null) {
                        rowMap[idx] = i;
                        res[idx++] = null;
                    }
                    continue;
                }

                if (val != null) {
                    rowMap[idx] = i;
                    res[idx++] = val;
                    continue;
                }

                if (keep_nulls) {
                    rowMap[idx] = i;
                    res[idx++] = null;
                }
            }
            (res as any).rowMap = rowMap;
            return res;
        });
    }

    first(null_on_oob: boolean = true) {
        return this.get(0, null_on_oob);
    }

    gather(
        indices: number | ArrayLike<number>,
        null_on_oob: boolean = true
    ) {
        return this._deriveArray((arr: any) => {
            const len = arr.length;
            const idxs = isArrayOrTypedArray(indices) ? indices : [indices];
            const numIndices = idxs.length;
            const res = new Array(numIndices);
            for (let i = 0; i < numIndices; i++) {
                const index = idxs[i];
                const val = arr.at(index);
                if (val === undefined && !null_on_oob) {
                    throw new ComputeError(`Index ${index} is out of bounds for array of length ${len}`);
                }
                res[i] = val ?? null;
            }
            return res;
        });
    }

    gather_every(options: StepSliceArrayOptions = {}) {
        return this._deriveArray((arr: any) => stepSliceArray(arr, options));
    }

    get(index: number, null_on_oob: boolean = true) {
        return this._deriveArray((arr: any) => {
            const val = arr.at(index);
            if (val === undefined && !null_on_oob) {
                throw new ComputeError(`Index ${index} is out of bounds for array of length ${arr.length}`);
            }
            return val ?? null;
        });
    }

    join(separator: string = ",", options: JoinArrayOptions = {}) {
        return this._deriveArray((arr: any) => joinArray(arr, separator, options));
    }

    last(null_on_oob: boolean = true) {
        return this.get(-1, null_on_oob);
    }

    len() {
        return this.lengths();
    }

    lengths() {
        return this._deriveArray((arr: any) => arr.length);
    }

    max() {
        return this._deriveArray((arr) => getArrayStats(arr).max);
    }

    mean() {
        return this._deriveArray((arr) => getArrayStats(arr).mean);
    }

    median() {
        return this._deriveArray((arr: any) => computeMedian(arr));
    }

    min() {
        return this._deriveArray((arr) => getArrayStats(arr).min);
    }

    mode() {
        return this._deriveArray((arr: any) => computeMode(arr));
    }

    n_unique(options: UniqueArrayStatsOptions = {}) {
        return this._deriveArray((arr: any) => getUniqueArrayStats(arr, options).count);
    }

    reverse() {
        return this._deriveArray((arr: any) => arr.slice().reverse());
    }

    slice(offset: number, length?: number) {
        return this._deriveArray((arr: any) => {
            const len = arr.length;
            const start = offset < 0 ? Math.max(0, len + offset) : offset;
            const end = length !== undefined ? start + length : len;
            return arr.slice(start, end);
        });
    }

    sort(options?: SortArrayOptions) {
        return this._deriveArray((arr) => sortArray(arr, options));
    }

    sum() {
        return this._deriveArray((arr) => getArrayStats(arr).sum);
    }

    unique(options: UniqueArrayStatsOptions = {}) {
        return this._deriveArray((arr: any) => getUniqueArrayStats(arr, options).values);
    }

    eval(expr: IExpr) {
        return derive(this.expr, (vArray, columns) => {
            const height = vArray.length;
            const result = new Array(height);
            for (let i = 0; i < height; i++) {
                const val = vArray[i];
                if (!isArrayOrTypedArray(val)) {
                    result[i] = null;
                    continue;
                }
                const subHeight = val.length;
                const subColumns = { ...columns, [ELEMENT_MARKER]: val };
                const isGlobalAgg = expr._aggFn != null && (expr._partitionBy == null || expr._partitionBy.length === 0);
                if (isGlobalAgg) {
                    const preOpsIdx = expr._groupingOpsIndex !== undefined ? expr._groupingOpsIndex : expr._ops.length;
                    const preVal = expr._evaluatePre(preOpsIdx, subColumns, subHeight);
                    const aggVal = expr._aggFn!(Array.from(preVal));
                    result[i] = expr._evaluatePost(preOpsIdx, [aggVal], subColumns);
                } else {
                    result[i] = evaluateExpression(expr, subColumns, subHeight);
                }
            }
            return result;
        });
    }
}

export class ArrayExpr extends ExprBase {
    get arr() {
        return new ArrayExprNamespace(this);
    }
}
