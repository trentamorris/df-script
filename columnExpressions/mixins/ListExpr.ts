import type { ExprConstructor } from "../../types";
import { kleene, derive } from "../ExprBase";
import { isArray, getListStats } from "../../utils";

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

    get(index: number, null_on_oob: boolean = true) {
        return this._deriveList((arr) => {
            const val = (arr as any).at(index);
            if (val === undefined) {
                if (!null_on_oob) {
                    throw new Error(`Index ${index} is out of bounds for list of length ${(arr as any).length}`);
                }
                return null;
            }
            return val;
        });
    }

    first(null_on_oob: boolean = true) {
        return this.get(0, null_on_oob);
    }

    last(null_on_oob: boolean = true) {
        return this.get(-1, null_on_oob);
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
        return this._deriveList((arr) => {
            const list = Array.from(arr as any);
            list.sort((a, b) => {
                if (a == null && b == null) return 0;
                if (a == null) return 1;
                if (b == null) return -1;
                if (a < b) return descending ? 1 : -1;
                if (a > b) return descending ? -1 : 1;
                return 0;
            });
            return list;
        });
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
