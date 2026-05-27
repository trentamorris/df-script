import type { ExprConstructor } from "../../types";
import { kleene, derive } from "../ExprBase";
import { isArray, getListStats, getListMedian, getListMode, sortList } from "../../utils";

export class ListExprNamespace {
    constructor(public expr: any) {}

    _deriveList(fn: (arr: any[] | ArrayBufferView) => any) {
        return derive(this.expr, (vArray) => {
            const height = vArray.length;
            const result = new Array(height);
            for (let i = 0; i < height; i++) {
                const v = vArray[i];
                result[i] = isArray(v) ? fn(v as any) : null;
            }
            return result;
        });
    }

    contains(item: any) {
        return this._deriveList((arr) => {
            return Array.from(arr as any).includes(item);
        });
    }

    count_matches(item: any) {
        return this._deriveList((arr) => {
            const list = Array.from(arr as any);
            let count = 0;
            for (const val of list) {
                if (val === item) {
                    count++;
                }
            }
            return count;
        });
    }

    first(null_on_oob: boolean = true) {
        return this.get(0, null_on_oob);
    }

    gather(indices: number | number[], null_on_oob: boolean = true) {
        const idxs = Array.isArray(indices) ? indices : [indices];
        return this._deriveList((arr) => {
            const len = (arr as any).length;
            const res = new Array(idxs.length);
            for (let i = 0; i < idxs.length; i++) {
                const index = idxs[i];
                const val = (arr as any).at(index);
                if (val === undefined && !null_on_oob) {
                    throw new Error(`Index ${index} is out of bounds for list of length ${len}`);
                }
                res[i] = val ?? null;
            }
            return res;
        });
    }

    gather_every(n: number, offset: number = 0) {
        if (n <= 0) {
            throw new Error("Step size n must be positive");
        }
        return this._deriveList((arr) => {
            const len = (arr as any).length;
            const res = [];
            for (let i = offset; i < len; i += n) {
                res.push((arr as any)[i]);
            }
            return res;
        });
    }

    get(index: number, null_on_oob: boolean = true) {
        return this._deriveList((arr) => {
            const val = (arr as any).at(index);
            if (val === undefined && !null_on_oob) {
                throw new Error(`Index ${index} is out of bounds for list of length ${(arr as any).length}`);
            }
            return val ?? null;
        });
    }

    join(separator: string) {
        return this._deriveList((arr) => {
            return Array.from(arr as any).map(x => x == null ? "" : String(x)).join(separator);
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
        return this._deriveList(getListMedian);
    }

    min() {
        return this._deriveList((arr) => getListStats(arr).min);
    }

    mode() {
        return this._deriveList(getListMode);
    }

    reverse() {
        return this._deriveList((arr) => {
            return Array.from(arr as any).reverse();
        });
    }

    slice(offset: number, length?: number) {
        return this._deriveList((arr) => {
            const list = Array.from(arr as any);
            const start = offset < 0 ? Math.max(0, list.length + offset) : offset;
            const end = length !== undefined ? start + length : list.length;
            return list.slice(start, end);
        });
    }

    sort(descending: boolean = false) {
        return this._deriveList((arr) => sortList(arr, descending));
    }

    sum() {
        return this._deriveList((arr) => getListStats(arr).sum);
    }

    unique() {
        return this._deriveList((arr) => {
            return Array.from(new Set(Array.from(arr as any)));
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
