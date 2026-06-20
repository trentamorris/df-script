import { ExprBase, derive } from "../ExprBase"
import { kleeneUnary, kleeneBinary } from "../utils"
import { isArrayOrTypedArray, isArrayOfType, isValidNumber, toCanonicalString, getUniqueArrayStats } from "../../utils"

function computeIsIn(vArray: ArrayLike<any>, columns: any, values: any, invert: boolean): any[] {
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
                const set = new Set();
                if (isArrayOrTypedArray(candidates)) {
                    const cLen = candidates.length;
                    for (let j = 0; j < cLen; j++) {
                        set.add(toCanonicalString(candidates[j]));
                    }
                } else {
                    set.add(toCanonicalString(candidates));
                }
                const hasVal = set.has(toCanonicalString(v));
                result[i] = invert ? !hasVal : hasVal;
            }
        }
    } else {
        const arr = isArrayOrTypedArray(values) ? values : [];
        const set = new Set();
        const arrLen = arr.length;
        for (let j = 0; j < arrLen; j++) {
            set.add(toCanonicalString(arr[j]));
        }
        for (let i = 0; i < height; i++) {
            const v = vArray[i];
            if (v == null) {
                result[i] = null;
            } else {
                const hasVal = set.has(toCanonicalString(v));
                result[i] = invert ? !hasVal : hasVal;
            }
        }
    }
    return result;
}

function evaluateDuplication(vArray: ArrayLike<any>, checkDuplicate: boolean): boolean[] {
    const { frequencies } = getUniqueArrayStats(vArray, { strict: true });
    const height = vArray.length;
    const result = new Array(height);
    for (let i = 0; i < height; i++) {
        const count = frequencies.get(vArray[i]) || 0;
        result[i] = checkDuplicate ? count > 1 : count === 1;
    }
    return result;
}

function compareMissing(vArray: ArrayLike<any>, rResolved: any, invert: boolean): boolean[] {
    const height = vArray.length;
    const result = new Array(height);
    if (isArrayOrTypedArray(rResolved)) {
        for (let i = 0; i < height; i++) {
            const v = vArray[i];
            const r = rResolved[i];
            if (v == null && r == null) {
                result[i] = !invert;
            } else if (v == null || r == null) {
                result[i] = invert;
            } else {
                result[i] = invert ? v !== r : v === r;
            }
        }
    } else {
        for (let i = 0; i < height; i++) {
            const v = vArray[i];
            if (v == null && rResolved == null) {
                result[i] = !invert;
            } else if (v == null || rResolved == null) {
                result[i] = invert;
            } else {
                result[i] = invert ? v !== rResolved : v === rResolved;
            }
        }
    }
    return result;
}

export class ComparisonExpr extends ExprBase {

        between(lower: any, upper: any, closed: "both" | "left" | "right" | "none" = "both") {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const lResolved = (this as any)._resolve(lower, columns, height);
                const uResolved = (this as any)._resolve(upper, columns, height);
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
                const rResolved = this._resolve(val, columns, vArray.length);
                return compareMissing(vArray, rResolved, false);
            });
        }

        ge(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v >= r));
        }

        gt(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v > r));
        }

        has_nulls() {
            return (this as any)._deriveAgg((v: any[]) => {
                for (let i = 0; i < v.length; i++) {
                    if (v[i] == null) return true;
                }
                return false;
            });
        }

        is_close(
            other: any,
            {
                abs_tol = 1e-8,
                rel_tol = 1e-8,
                nans_equal = false
            }: {
                abs_tol?: number;
                rel_tol?: number;
                nans_equal?: boolean;
            } = {}
        ) {
            return derive(this, (vArray, columns) => {
                const height = vArray.length;
                const otherVal = (this as any)._resolve(other, columns, height);
                const isOtherArray = isArrayOrTypedArray(otherVal);
                const result = new Array(height);
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    const o = isOtherArray ? otherVal[i] : otherVal;
                    if (v == null || o == null) {
                        result[i] = null;
                    } else if (isValidNumber(v) && isValidNumber(o)) {
                        const absDiff = Math.abs(v - o);
                        const threshold = Math.max(rel_tol * Math.max(Math.abs(v), Math.abs(o)), abs_tol);
                        result[i] = absDiff <= threshold;
                    } else if (Number.isNaN(v) && Number.isNaN(o)) {
                        result[i] = nans_equal;
                    } else {
                        result[i] = (v === o);
                    }
                }
                return result;
            });
        }

        is_duplicated() {
            return derive(this, (vArray) => evaluateDuplication(vArray, true));
        }

        is_empty({ ignoreNulls = false }: { ignoreNulls?: boolean } = {}) {
            return derive(this, kleeneUnary((v) => {
                if (typeof v === "string") {
                    return v.length === 0;
                }
                if (isArrayOrTypedArray(v)) {
                    if (ignoreNulls) {
                        return isArrayOfType(v, "nullish", {
                            mode: "every"
                        });
                    }
                    return (v as any).length === 0;
                }
                return null;
            }));
        }

        is_finite() {
            return derive(this, kleeneUnary(Number.isFinite));
        }


        is_in(values: any[] | any) {
            return derive(this, (vArray, columns) => computeIsIn(vArray, columns, values, false));
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

        is_unique() {
            return derive(this, (vArray) => evaluateDuplication(vArray, false));
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
                const rResolved = this._resolve(val, columns, vArray.length);
                return compareMissing(vArray, rResolved, true);
            });
        }

        not_in(values: any[] | any) {
            return derive(this, (vArray, columns) => computeIsIn(vArray, columns, values, true));
        }

}
