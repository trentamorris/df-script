import type { ExprConstructor } from "../types";
import { kleeneUnary, derive } from "../ExprBase";
import { isArrayOrTypedArray, getListStats, sortList, computeMedian } from "../../utils";
import { ComputeError } from "../../exceptions";

export class ListExprNamespace {
    constructor(public expr: any) { }

    _deriveList(fn: (arr: any[] | ArrayBufferView) => any) {
        return derive(this.expr, kleeneUnary((v) => {
            return isArrayOrTypedArray(v) ? fn(v as any) : null;
        }));
    }

    all() {
        return this._deriveList((arr) => {
            const list = Array.from(arr as any);
            for (let i = 0; i < list.length; i++) {
                if (!list[i]) return false;
            }
            return true;
        });
    }

    any() {
        return this._deriveList((arr) => {
            const list = Array.from(arr as any);
            for (let i = 0; i < list.length; i++) {
                if (list[i]) return true;
            }
            return false;
        });
    }

    contains(item: any) {
        return this._deriveList((arr) => {
            return Array.from(arr as any).includes(item);
        });
    }

    contains_all(items: any[]) {
        return this._deriveList((arr) => {
            const list = Array.from(arr as any);
            for (let i = 0; i < items.length; i++) {
                if (!list.includes(items[i])) return false;
            }
            return true;
        });
    }

    contains_any(items: any[]) {
        return this._deriveList((arr) => {
            const list = Array.from(arr as any);
            for (let i = 0; i < items.length; i++) {
                if (list.includes(items[i])) return true;
            }
            return false;
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

    drop_nulls() {
        return this._deriveList((arr) => {
            const list = Array.from(arr as any);
            const result: any[] = [];
            for (let i = 0; i < list.length; i++) {
                if (list[i] != null) result.push(list[i]);
            }
            return result;
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
                    throw new ComputeError(`Index ${index} is out of bounds for list of length ${len}`);
                }
                res[i] = val ?? null;
            }
            return res;
        });
    }

    gather_every(n: number, offset: number = 0) {
        if (n <= 0) {
            throw new ComputeError("Step size n must be positive");
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
                throw new ComputeError(`Index ${index} is out of bounds for list of length ${(arr as any).length}`);
            }
            return val ?? null;
        });
    }

    join(separator: string, { ignoreNulls = false }: { ignoreNulls?: boolean } = {}) {
        return this._deriveList((arr) => {
            const list = Array.from(arr as any);
            const strList: string[] = [];
            for (let i = 0; i < list.length; i++) {
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
        return this._deriveList((arr) => computeMedian(Array.from(arr as any)));
    }

    min() {
        return this._deriveList((arr) => getListStats(arr).min);
    }

    mode() {
        return this._deriveList((arr) => {
            const len = (arr as any).length;
            const counts = new Map<any, number>();
            let maxCount = 0;

            for (let i = 0; i < len; i++) {
                const val = (arr as any)[i];
                if (val == null) continue;
                const c = (counts.get(val) ?? 0) + 1;
                counts.set(val, c);
                if (c > maxCount) maxCount = c;
            }

            if (maxCount === 0) return [];

            const modes: any[] = [];
            for (const [val, c] of counts.entries()) {
                if (c === maxCount) {
                    modes.push(val);
                }
            }

            return sortList(modes);
        });
    }

    n_unique() {
        return this._deriveList((arr) => {
            return new Set(Array.from(arr as any)).size;
        });
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
            return Array.from(new Set(arr as any));
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
