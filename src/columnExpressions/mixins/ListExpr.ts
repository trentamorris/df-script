import type { ExprConstructor } from "../types";
import { kleeneUnary, derive } from "../ExprBase";
import { isArrayOrTypedArray, getListStats, sortList, computeMedian, getUniqueListStats, computeMode, isArrayOfType, stepSliceList, StepSliceListOptions, joinList } from "../../utils";
import { ComputeError } from "../../exceptions";
import type { UniqueListStatsOptions, JoinListOptions } from "../../types";

export class ListExprNamespace {
    constructor(public expr: any) { }

    _deriveList(fn: (arr: any[] | ArrayBufferView) => any) {
        return derive(this.expr, kleeneUnary((v) => {
            return isArrayOrTypedArray(v) ? fn(v as any) : null;
        }));
    }

    all() {
        return this._deriveList((arr) => isArrayOfType(arr, (x) => !!x, { mode: "every" }));
    }

    any() {
        return this._deriveList((arr) => isArrayOfType(arr, (x) => !!x, { mode: "some" }));
    }

    contains(item: any) {
        return this._deriveList((arr: any) => arr.includes(item));
    }

    contains_all(items: any[]) {
        return this._deriveList((arr: any) => isArrayOfType(items, (x) => arr.includes(x), { mode: "every" }));
    }

    contains_any(items: any[]) {
        return this._deriveList((arr: any) => isArrayOfType(items, (x) => arr.includes(x), { mode: "some" }));
    }

    count_matches(item: any) {
        return this._deriveList((arr: any) => {
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
        return this._deriveList((arr: any) => {
            const len = arr.length;
            const result: any[] = [];
            for (let i = 0; i < len; i++) {
                if (arr[i] != null) result.push(arr[i]);
            }
            return result;
        });
    }

    first(null_on_oob: boolean = true) {
        return this.get(0, null_on_oob);
    }

    gather(
        indices: number | number[],
        null_on_oob: boolean = true
    ) {
        return this._deriveList((arr: any) => {
            const len = arr.length;
            const idxs = Array.isArray(indices) ? indices : [indices];
            const numIndices = idxs.length;
            const res = new Array(numIndices);
            for (let i = 0; i < numIndices; i++) {
                const index = idxs[i];
                const val = arr.at(index);
                if (val === undefined && !null_on_oob) {
                    throw new ComputeError(`Index ${index} is out of bounds for list of length ${len}`);
                }
                res[i] = val ?? null;
            }
            return res;
        });
    }

    gather_every(options: StepSliceListOptions = {}) {
        return this._deriveList((arr: any) => stepSliceList(arr, options));
    }

    get(index: number, null_on_oob: boolean = true) {
        return this._deriveList((arr: any) => {
            const val = arr.at(index);
            if (val === undefined && !null_on_oob) {
                throw new ComputeError(`Index ${index} is out of bounds for list of length ${arr.length}`);
            }
            return val ?? null;
        });
    }

    join(separator: string = ",", options: JoinListOptions = {}) {
        return this._deriveList((arr: any) => joinList(arr, separator, options));
    }

    last(null_on_oob: boolean = true) {
        return this.get(-1, null_on_oob);
    }

    len() {
        return this.lengths();
    }

    lengths() {
        return this._deriveList((arr: any) => arr.length);
    }

    max() {
        return this._deriveList((arr) => getListStats(arr).max);
    }

    mean() {
        return this._deriveList((arr) => getListStats(arr).mean);
    }

    median() {
        return this._deriveList((arr: any) => computeMedian(arr));
    }

    min() {
        return this._deriveList((arr) => getListStats(arr).min);
    }

    mode() {
        return this._deriveList((arr: any) => computeMode(arr));
    }

    n_unique(options: UniqueListStatsOptions = {}) {
        return this._deriveList((arr: any) => getUniqueListStats(arr, options).count);
    }

    reverse() {
        return this._deriveList((arr: any) => arr.slice().reverse());
    }

    slice(offset: number, length?: number) {
        return this._deriveList((arr: any) => {
            const len = arr.length;
            const start = offset < 0 ? Math.max(0, len + offset) : offset;
            const end = length !== undefined ? start + length : len;
            return arr.slice(start, end);
        });
    }

    sort(descending: boolean = false) {
        return this._deriveList((arr) => sortList(arr, descending));
    }

    sum() {
        return this._deriveList((arr) => getListStats(arr).sum);
    }

    unique(options: UniqueListStatsOptions = {}) {
        return this._deriveList((arr: any) => getUniqueListStats(arr, options).values);
    }
}

export const ListExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        get list() {
            return new ListExprNamespace(this);
        }
    };
};
