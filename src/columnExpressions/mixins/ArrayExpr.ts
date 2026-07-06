import { ExprBase, derive } from "../ExprBase";
import { kleeneUnary, evaluateExpression } from "../utils";
import {
    isArrayOrTypedArray,
    getArrayStats,
    sortArray,
    SortArrayOptions,
    computeMedian,
    getUniqueArrayStats,
    computeMode,
    isArrayOfType,
    stepSliceArray,
    StepSliceArrayOptions,
    joinArray,
    getArrayElement,
    shiftArray
} from "../../utils";
import type { UniqueArrayStatsOptions, JoinArrayOptions, ExplodeOptions, IExpr, AnyTypedArray, ToStructOptions } from "../../types";
import { ELEMENT_MARKER } from "../constants";

export class ArrayExprNamespace {
    constructor(public expr: any) { }

    _deriveArray(fn: (arr: any[] | AnyTypedArray) => any) {
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
        return this._deriveArray((arr) => arr.includes(item));
    }

    contains_all(items: ArrayLike<any>) {
        return this._deriveArray((arr) => isArrayOfType(items, (x) => arr.includes(x), { mode: "every" }));
    }

    contains_any(items: ArrayLike<any>) {
        return this._deriveArray((arr) => isArrayOfType(items, (x) => arr.includes(x), { mode: "some" }));
    }

    count_matches(item: any, options: UniqueArrayStatsOptions = {}) {
        return this._deriveArray((arr) => getUniqueArrayStats(arr, options).frequencies.get(item) ?? 0);
    }

    filter(expr: IExpr) {
        return derive(this.expr, (vArray, columns) => {
            const height = vArray.length;
            const result = new Array(height);
            const subColumns = Object.create(columns);
            for (let i = 0; i < height; i++) {
                const val = vArray[i];
                if (!isArrayOrTypedArray(val)) {
                    result[i] = null;
                    continue;
                }
                const subHeight = val.length;
                subColumns[ELEMENT_MARKER] = val;
                const mask = evaluateExpression(expr, subColumns, subHeight);
                const res = [];
                if (isArrayOrTypedArray(mask)) {
                    const limit = Math.min(subHeight, mask.length);
                    for (let j = 0; j < limit; j++) {
                        if (mask[j]) {
                            res.push(val[j]);
                        }
                    }
                } else if (mask) {
                    for (let j = 0; j < subHeight; j++) {
                        res.push(val[j]);
                    }
                }
                result[i] = res;
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
        return this._deriveArray((arr) => {
            const idxs = typeof indices === "number" ? [indices] : indices;
            const numIndices = idxs.length;
            const res = new Array(numIndices);
            for (let i = 0; i < numIndices; i++) {
                res[i] = getArrayElement(arr, idxs[i], null_on_oob);
            }
            return res;
        });
    }

    gather_every(options: StepSliceArrayOptions = {}) {
        return this._deriveArray((arr) => stepSliceArray(arr, options));
    }

    get(index: number, null_on_oob: boolean = true) {
        return this._deriveArray((arr) => getArrayElement(arr, index, null_on_oob));
    }

    join(separator: string = ",", options: JoinArrayOptions = {}) {
        return this._deriveArray((arr) => joinArray(arr, separator, options));
    }

    last(null_on_oob: boolean = true) {
        return this.get(-1, null_on_oob);
    }

    len() {
        return this.lengths();
    }

    lengths() {
        return this._deriveArray((arr) => arr.length);
    }

    max() {
        return this._deriveArray((arr) => getArrayStats(arr).max);
    }

    max_index() {
        return this._deriveArray((arr) => getArrayStats(arr).maxIdx);
    }

    mean() {
        return this._deriveArray((arr) => getArrayStats(arr).mean);
    }

    median() {
        return this._deriveArray((arr) => computeMedian(arr));
    }

    min() {
        return this._deriveArray((arr) => getArrayStats(arr).min);
    }

    min_index() {
        return this._deriveArray((arr) => getArrayStats(arr).minIdx);
    }

    mode() {
        return this._deriveArray((arr) => computeMode(arr));
    }

    n_unique(options: UniqueArrayStatsOptions = {}) {
        return this._deriveArray((arr) => getUniqueArrayStats(arr, options).count);
    }

    reverse() {
        return this._deriveArray((arr) => arr.slice().reverse());
    }

    shift(n: number = 1) {
        return this._deriveArray((arr) => shiftArray(arr, n));
    }

    slice(start?: number, end?: number) {
        return this._deriveArray((arr) => arr.slice(start, end));
    }

    splice(start: number, deleteCount?: number, ...items: any[]) {
        return this._deriveArray((arr) => {
            const copy = [...arr];
            copy.splice(start, deleteCount ?? copy.length, ...items);
            return copy;
        });
    }

    sort(options?: SortArrayOptions) {
        return this._deriveArray((arr) => sortArray(arr, options));
    }

    std() {
        return this._deriveArray((arr) => getArrayStats(arr).std);
    }

    sum() {
        return this._deriveArray((arr) => getArrayStats(arr).sum);
    }

    to_struct({ upper_bound, fields }: ToStructOptions = {}) {
        return derive(this.expr, (vArray) => {
            const height = vArray.length;
            const result = new Array(height);

            let width = 0;
            if (Array.isArray(fields)) {
                width = fields.length;
            } else if (typeof upper_bound === "number") {
                width = upper_bound;
            } else {
                for (let i = 0; i < height; i++) {
                    const val = vArray[i];
                    if (isArrayOrTypedArray(val) && val.length > width) {
                        width = val.length;
                    }
                }
            }

            if (width === 0) {
                throw new Error("to_struct cannot be evaluated: struct width is 0. Provide an upper_bound, non-empty fields names, or non-empty lists.");
            }

            const names = new Array<string>(width);
            for (let j = 0; j < width; j++) {
                if (typeof fields === "function") {
                    names[j] = fields(j);
                } else {
                    names[j] = (Array.isArray(fields) ? fields[j] : null) ?? `field_${j}`;
                }
            }

            for (let i = 0; i < height; i++) {
                const val = vArray[i];
                if (!isArrayOrTypedArray(val)) {
                    result[i] = null;
                    continue;
                }
                const obj: any = {};
                for (let j = 0; j < width; j++) {
                    obj[names[j]] = getArrayElement(val, j, true);
                }
                result[i] = obj;
            }
            return result;
        });
    }

    unique(options: UniqueArrayStatsOptions = {}) {
        return this._deriveArray((arr) => getUniqueArrayStats(arr, options).values);
    }

    variance() {
        return this._deriveArray((arr) => getArrayStats(arr).variance);
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