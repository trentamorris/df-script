import type { ExprConstructor } from "../types";
import { kleeneUnary, derive } from "../ExprBase";
import { isArrayOrTypedArray, getListStats, sortList, computeMedian, getUniqueListStats, computeMode, isArrayOfType, isObj, stepSlice } from "../../utils";
import { ComputeError } from "../../exceptions";
import type { UniqueListStatsOptions } from "../../types";

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
        return this._deriveList((arr) => {
            return (arr as any).includes(item);
        });
    }

    contains_all(items: any[]) {
        return this._deriveList((arr) => {
            const list = arr as any;
            for (let i = 0; i < items.length; i++) {
                if (!list.includes(items[i])) return false;
            }
            return true;
        });
    }

    contains_any(items: any[]) {
        return this._deriveList((arr) => {
            const list = arr as any;
            for (let i = 0; i < items.length; i++) {
                if (list.includes(items[i])) return true;
            }
            return false;
        });
    }

    count_matches(item: any) {
        return this._deriveList((arr) => {
            const list = arr as any;
            let count = 0;
            const len = list.length;
            for (let i = 0; i < len; i++) {
                if (list[i] === item) {
                    count++;
                }
            }
            return count;
        });
    }

    drop_nulls() {
        return this._deriveList((arr) => {
            const list = arr as any;
            const len = list.length;
            const result: any[] = [];
            for (let i = 0; i < len; i++) {
                if (list[i] != null) result.push(list[i]);
            }
            return result;
        });
    }

    first(null_on_oob: boolean = true) {
        return this.get(0, null_on_oob);
    }

    gather(indices: number | number[] | { every: number; offset?: number }, null_on_oob: boolean = true) {
        return this._deriveList((arr) => {
            const list = arr as any;
            const len = list.length;

            if (isObj(indices) && "every" in indices) {
                const { every, offset = 0 } = indices as { every: number; offset?: number };
                try {
                    return stepSlice(list, every, offset);
                } catch (e: any) {
                    throw new ComputeError(e.message || "Invalid gather step parameters");
                }
            }

            const idxs = Array.isArray(indices) ? indices : [indices as any];
            const numIndices = idxs.length;
            const res = new Array(numIndices);
            for (let i = 0; i < numIndices; i++) {
                const index = idxs[i];
                const val = list.at(index);
                if (val === undefined && !null_on_oob) {
                    throw new ComputeError(`Index ${index} is out of bounds for list of length ${len}`);
                }
                res[i] = val ?? null;
            }
            return res;
        });
    }

    get(index: number, null_on_oob: boolean = true) {
        return this._deriveList((arr) => {
            const val = (arr as any).at(index);
            if (val === undefined && !null_on_oob) {
                throw new ComputeError(`Index ${index} is out of bounds for list of length ${(arr as any).length}`);
            }
            return val ?? null;
        });
    }

    join(separator: string = ",", options: { ignoreNulls?: boolean } = {}) {
        const ignoreNulls = options?.ignoreNulls ?? false;
        return this._deriveList((arr) => {
            const list = arr as any;
            const len = list.length;
            const strList: string[] = [];
            for (let i = 0; i < len; i++) {
                const x = list[i];
                if (x != null) {
                    strList.push(String(x));
                } else if (!ignoreNulls) {
                    strList.push("");
                }
            }
            return strList.join(separator);
        });
    }

    last(null_on_oob: boolean = true) {
        return this.get(-1, null_on_oob);
    }

    len() {
        return this.lengths();
    }

    lengths() {
        return this._deriveList((arr) => (arr as any).length);
    }

    max() {
        return this._deriveList((arr) => getListStats(arr).max);
    }

    mean() {
        return this._deriveList((arr) => {
            const { sum, count } = getListStats(arr);
            return sum !== null && count > 0 ? sum / count : null;
        });
    }

    median() {
        return this._deriveList((arr) => computeMedian(arr as any));
    }

    min() {
        return this._deriveList((arr) => getListStats(arr).min);
    }

    mode() {
        return this._deriveList((arr) => {
            return computeMode(arr as any);
        });
    }

    n_unique(options: UniqueListStatsOptions = {}) {
        return this._deriveList((arr) => {
            return getUniqueListStats(arr as any, options).count;
        });
    }

    reverse() {
        return this._deriveList((arr) => {
            return (arr as any).slice().reverse();
        });
    }

    slice(offset: number, length?: number) {
        return this._deriveList((arr) => {
            const list = arr as any;
            const len = list.length;
            const start = offset < 0 ? Math.max(0, len + offset) : offset;
            const end = length !== undefined ? start + length : len;
            return list.slice(start, end);
        });
    }

    sort(descending: boolean = false) {
        return this._deriveList((arr) => sortList(arr, descending));
    }

    sum() {
        return this._deriveList((arr) => getListStats(arr).sum);
    }

    unique(options: UniqueListStatsOptions = {}) {
        return this._deriveList((arr) => {
            return getUniqueListStats(arr as any, options).values;
        });
    }
}

export const ListExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        get list() {
            return new ListExprNamespace(this);
        }
    };
};
