import type { IExpr } from "../../types"
import type { ExprConstructor } from "../types"
import { derive, kleeneUnary, kleeneBinary } from "../ExprBase"
import { isArrayOrTypedArray } from "../../utils"

export const ComparisonExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {

        between(lower: any, upper: any, closed: "both" | "left" | "right" | "none" = "both") {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const lResolved = this._resolve(lower, columns, height);
                const uResolved = this._resolve(upper, columns, height);
                const result = new Array(height);

                const isLArray = isArrayOrTypedArray(lResolved);
                const isUArray = isArrayOrTypedArray(uResolved);

                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    const l = isLArray ? lResolved[i] : lResolved;
                    const u = isUArray ? uResolved[i] : uResolved;

                    if (v == null || l == null || u == null) {
                        result[i] = null;
                    } else {
                        const geLower = closed === "both" || closed === "left" ? v >= l : v > l;
                        const leUpper = closed === "both" || closed === "right" ? v <= u : v < u;
                        result[i] = geLower && leUpper;
                    }
                }
                return result;
            });
        }

        eq(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v === r));
        }

        eq_missing(val: any) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const rResolved = this._resolve(val, columns, height);
                const result = new Array(height);
                if (isArrayOrTypedArray(rResolved)) {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        const r = rResolved[i];
                        if (v == null && r == null) result[i] = true;
                        else if (v == null || r == null) result[i] = false;
                        else result[i] = v === r;
                    }
                } else {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        if (v == null && rResolved == null) result[i] = true;
                        else if (v == null || rResolved == null) result[i] = false;
                        else result[i] = v === rResolved;
                    }
                }
                return result;
            });
        }

        ge(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v >= r));
        }

        gt(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v > r));
        }

        is_finite() {
            return derive(this, kleeneUnary(Number.isFinite));
        }

        is_in(values: any[] | IExpr) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const result = new Array(height);
                if (values && typeof values === 'object' && 'evaluate' in values) {
                    const resolved = values.evaluate(columns, height);
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        if (v == null) {
                            result[i] = null;
                        } else {
                            const candidates = resolved[i];
                            const set = isArrayOrTypedArray(candidates) ? new Set(candidates) : new Set([candidates]);
                            result[i] = set.has(v);
                        }
                    }
                } else {
                    const arr = isArrayOrTypedArray(values) ? values : [];
                    const set = new Set(arr);
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        result[i] = v == null ? null : set.has(v);
                    }
                }
                return result;
            });
        }

        is_infinite() {
            return derive(this, kleeneUnary((v) => v === Infinity || v === -Infinity));
        }

        is_nan() {
            return derive(this, kleeneUnary(Number.isNaN));
        }

        is_not_nan() {
            return derive(this, kleeneUnary((v) => !Number.isNaN(v)));
        }

        is_not_null() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    result[i] = vArray[i] != null;
                }
                return result;
            });
        }

        is_null() {
            return derive(this, (vArray) => {
                const height = vArray.length;
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    result[i] = vArray[i] == null;
                }
                return result;
            });
        }

        le(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v <= r));
        }

        lt(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v < r));
        }

        ne(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v !== r));
        }

        ne_missing(val: any) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const rResolved = this._resolve(val, columns, height);
                const result = new Array(height);
                if (isArrayOrTypedArray(rResolved)) {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        const r = rResolved[i];
                        if (v == null && r == null) result[i] = false;
                        else if (v == null || r == null) result[i] = true;
                        else result[i] = v !== r;
                    }
                } else {
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        if (v == null && rResolved == null) result[i] = false;
                        else if (v == null || rResolved == null) result[i] = true;
                        else result[i] = v !== rResolved;
                    }
                }
                return result;
            });
        }

        not_in(values: any[] | IExpr) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const result = new Array(height);
                if (values && typeof values === 'object' && 'evaluate' in values) {
                    const resolved = values.evaluate(columns, height);
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        if (v == null) {
                            result[i] = null;
                        } else {
                            const candidates = resolved[i];
                            const set = isArrayOrTypedArray(candidates) ? new Set(candidates) : new Set([candidates]);
                            result[i] = !set.has(v);
                        }
                    }
                } else {
                    const arr = isArrayOrTypedArray(values) ? values : [];
                    const set = new Set(arr);
                    for (let i = 0; i < height; i++) {
                        const v = vArray[i];
                        result[i] = v == null ? null : !set.has(v);
                    }
                }
                return result;
            });
        }

    }
}
