import type { ExprConstructor } from "../../types";
import { kleene, derive } from "../ExprBase";

class ListExprNamespace {
    constructor(private expr: any) {}

    private _deriveList(fn: (arr: any[]) => any) {
        return derive(this.expr, kleene((v) => {
            return Array.isArray(v) ? fn(v) : null;
        }));
    }

    lengths() {
        return this._deriveList((arr) => arr.length);
    }

    len() {
        return this.lengths();
    }

    max() {
        return this._deriveList((arr) => {
            if (arr.length === 0) return null;
            let maxVal: any = null;
            for (const val of arr) {
                if (val == null) continue;
                if (maxVal == null || val > maxVal) {
                    maxVal = val;
                }
            }
            return maxVal;
        });
    }

    min() {
        return this._deriveList((arr) => {
            if (arr.length === 0) return null;
            let minVal: any = null;
            for (const val of arr) {
                if (val == null) continue;
                if (minVal == null || val < minVal) {
                    minVal = val;
                }
            }
            return minVal;
        });
    }

    sum() {
        return this._deriveList((arr) => {
            let total = 0;
            let count = 0;
            for (const val of arr) {
                if (typeof val === "number" || typeof val === "bigint") {
                    total += Number(val);
                    count++;
                }
            }
            return count > 0 ? total : null;
        });
    }

    mean() {
        return this._deriveList((arr) => {
            let total = 0;
            let count = 0;
            for (const val of arr) {
                if (typeof val === "number" || typeof val === "bigint") {
                    total += Number(val);
                    count++;
                }
            }
            return count > 0 ? total / count : null;
        });
    }

    get(index: number) {
        return this._deriveList((arr) => {
            const idx = index < 0 ? arr.length + index : index;
            if (idx < 0 || idx >= arr.length) return null;
            const val = arr[idx];
            return val !== undefined ? val : null;
        });
    }

    first() {
        return this.get(0);
    }

    last() {
        return this.get(-1);
    }

    contains(item: any) {
        return this._deriveList((arr) => {
            return arr.includes(item);
        });
    }

    join(separator: string) {
        return this._deriveList((arr) => {
            return arr.map(x => x == null ? "" : String(x)).join(separator);
        });
    }

    sort(descending: boolean = false) {
        return this._deriveList((arr) => {
            const copy = [...arr];
            copy.sort((a, b) => {
                if (a == null && b == null) return 0;
                if (a == null) return 1;
                if (b == null) return -1;
                if (a < b) return descending ? 1 : -1;
                if (a > b) return descending ? -1 : 1;
                return 0;
            });
            return copy;
        });
    }

    reverse() {
        return this._deriveList((arr) => {
            return [...arr].reverse();
        });
    }

    unique() {
        return this._deriveList((arr) => {
            return Array.from(new Set(arr));
        });
    }

    slice(offset: number, length?: number) {
        return this._deriveList((arr) => {
            const start = offset < 0 ? Math.max(0, arr.length + offset) : offset;
            const end = length !== undefined ? start + length : arr.length;
            return arr.slice(start, end);
        });
    }

    count_matches(item: any) {
        return this._deriveList((arr) => {
            let count = 0;
            for (const val of arr) {
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
