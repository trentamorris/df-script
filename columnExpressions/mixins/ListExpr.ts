import type { ExprConstructor } from "../../types";
import { kleene, derive } from "../ExprBase";
import { isArray, getListStats, getListMedian, getListMode, sortList } from "../../utils";

class ListExprNamespace {
    constructor(private expr: any) {}

    private _deriveList(fn: (arr: any[] | ArrayBufferView) => any) {
        return derive(this.expr, kleene((v) => {
            return isArray(v) ? fn(v as any) : null;
        }));
    }

    lengths() {
        return this._deriveList((arr) => (arr as any).length);
    }

    len() {
        return this.lengths();
    }

    max() {
        return this._deriveList((arr) => getListStats(arr).max);
    }

    min() {
        return this._deriveList((arr) => getListStats(arr).min);
    }

    sum() {
        return this._deriveList((arr) => getListStats(arr).sum);
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

    mode() {
        return this._deriveList(getListMode);
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

    first(null_on_oob: boolean = true) {
        return this.get(0, null_on_oob);
    }

    last(null_on_oob: boolean = true) {
        return this.get(-1, null_on_oob);
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

    contains(item: any) {
        return this._deriveList((arr) => {
            return Array.from(arr as any).includes(item);
        });
    }

    join(separator: string) {
        return this._deriveList((arr) => {
            return Array.from(arr as any).map(x => x == null ? "" : String(x)).join(separator);
        });
    }

    sort(descending: boolean = false) {
        return this._deriveList((arr) => sortList(arr, descending));
    }

    reverse() {
        return this._deriveList((arr) => {
            return Array.from(arr as any).reverse();
        });
    }

    unique() {
        return this._deriveList((arr) => {
            return Array.from(new Set(Array.from(arr as any)));
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
}

export const ListExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        get list() {
            return new ListExprNamespace(this);
        }
    };
};
