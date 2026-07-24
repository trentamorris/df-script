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

        /**
         * Checks if values fall inside lower and upper boundaries (inclusive).
         * @param lower The lower boundary value or expression.
         * @param upper The upper boundary value or expression.
         * @param closed Control boundary inclusivity: "both", "left", "right", or "none" (default: "both").
         * @returns ColumnExpression
         * @example
         * >>> df.with_columns($df.col("a").between(1, 2).alias("in_range"))
         * shape: (3, 3)
         * ┌───┬───┬──────────┐
         * │ a │ b │ in_range │
         * ├───┼───┼──────────┤
         * │ 1 │ x │ true     │
         * │ 2 │ y │ true     │
         * │ 3 │ z │ false    │
         * └───┴───┴──────────┘
         */
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

        /**
         * Boolean comparison: Returns true if column values match the specified value exactly.
         * @param val The value or column expression to compare against.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({
         * ...   a: [1, 2, 3]
         * ... })
         * shape: (3, 1)
         * ┌───┐
         * │ a │
         * ├───┤
         * │ 1 │
         * │ 2 │
         * │ 3 │
         * └───┘
         * 
         * >>> df.with_columns($df.col("a").eq(2).alias("is_two"))
         * shape: (3, 2)
         * ┌───┬────────┐
         * │ a │ is_two │
         * ├───┼────────┤
         * │ 1 │ false  │
         * │ 2 │ true   │
         * │ 3 │ false  │
         * └───┴────────┘
         */
        eq(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v === r));
        }

        /**
         * Equivalence check that treats null values as equal to each other.
         * @param val The value or column expression to compare against.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ a: [1, null, 3] })
         * >>> df.with_columns($df.col("a").eq_missing(null).alias("is_missing"))
         * shape: (3, 2)
         * ┌──────┬────────────┐
         * │ a    │ is_missing │
         * ├──────┼────────────┤
         * │ 1    │ false      │
         * │ null │ true       │
         * │ 3    │ false      │
         * └──────┴────────────┘
         */
        eq_missing(val: any) {
            return derive(this, (vArray, columns) => {
                const rResolved = this._resolve(val, columns, vArray.length);
                return compareMissing(vArray, rResolved, false);
            });
        }

        /**
         * Boolean comparison: Returns true if greater than or equal to argument.
         * @param val The value or column expression to compare against.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ price: [90, 100, 110] })
         * >>> df.with_columns($df.col("price").ge(100).alias("ge_100"))
         * shape: (3, 2)
         * ┌───────┬────────┐
         * │ price │ ge_100 │
         * ├───────┼────────┤
         * │ 90    │ false  │
         * │ 100   │ true   │
         * │ 110   │ true   │
         * └───────┴────────┘
         */
        ge(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v >= r));
        }

        /**
         * Boolean comparison: Returns true if column value is greater than argument.
         * @param val The value or column expression to compare against.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ price: [90, 100, 110] })
         * >>> df.with_columns($df.col("price").gt(100).alias("gt_100"))
         * shape: (3, 2)
         * ┌───────┬────────┐
         * │ price │ gt_100 │
         * ├───────┼────────┤
         * │ 90    │ false  │
         * │ 100   │ false  │
         * │ 110   │ true   │
         * └───────┴────────┘
         */
        gt(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v > r));
        }

        /**
         * Aggregation: Checks if any value in the group is null.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ group: ["A", "A"], val: [10, null] })
         * >>> df.group_by("group").agg($df.col("val").has_nulls().alias("has_nulls"))
         * shape: (1, 2)
         * ┌───────┬───────────┐
         * │ group │ has_nulls │
         * ├───────┼───────────┤
         * │ "A"   │ true      │
         * └───────┴───────────┘
         */
        has_nulls() {
            return (this as any)._deriveAgg((v: any[]) => {
                for (let i = 0; i < v.length; i++) {
                    if (v[i] == null) return true;
                }
                return false;
            });
        }

        /**
         * Determines if floating-point values are approximately equal within tolerances.
         * @param other The value or expression to compare against.
         * @param options Tolerance values absolute (abs_tol) and relative (rel_tol), and NaN options.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ a: [1.000000001, 2.0] })
         * >>> df.with_columns($df.col("a").is_close(1.0).alias("close"))
         * shape: (2, 2)
         * ┌─────────────┬───────┐
         * │ a           │ close │
         * ├─────────────┼───────┤
         * │ 1.000000001 │ true  │
         * │ 2.0         │ false │
         * └─────────────┴───────┘
         */
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

        /**
         * Checks if values occur more than once in the column.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ a: [1, 2, 2] })
         * >>> df.with_columns($df.col("a").is_duplicated().alias("dup"))
         * shape: (3, 2)
         * ┌───┬───────┐
         * │ a │ dup   │
         * ├───┼───────┤
         * │ 1 │ false │
         * │ 2 │ true  │
         * │ 2 │ true  │
         * └───┴───────┘
         */
        is_duplicated() {
            return derive(this, (vArray) => evaluateDuplication(vArray, true));
        }

        /**
         * Checks if strings or nested arrays have length 0.
         * @param options Config options including whether to ignore nulls inside arrays.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ a: ["", "hello", []] })
         * >>> df.with_columns($df.col("a").is_empty().alias("empty"))
         * shape: (3, 2)
         * ┌─────────┬───────┐
         * │ a       │ empty │
         * ├─────────┼───────┤
         * │ ""      │ true  │
         * │ "hello" │ false │
         * │ []      │ true  │
         * └─────────┴───────┘
         */
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

        /**
         * Checks if values are finite numbers (not NaN or Infinity).
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ a: [1.5, Infinity, NaN] })
         * >>> df.with_columns($df.col("a").is_finite().alias("finite"))
         * shape: (3, 2)
         * ┌──────────┬────────┐
         * │ a        │ finite │
         * ├──────────┼────────┤
         * │ 1.5      │ true   │
         * │ Infinity │ false  │
         * │ NaN      │ false  │
         * └──────────┴────────┘
         */
        is_finite() {
            return derive(this, kleeneUnary(Number.isFinite));
        }


        /**
         * Checks if column values are members of a specified array or list.
         * @param values An array of candidate values or a single value to match against.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ category: ["toys", "books", "food"] })
         * >>> df.with_columns($df.col("category").is_in(["toys", "books"]).alias("in_list"))
         * shape: (3, 2)
         * ┌──────────┬─────────┐
         * │ category │ in_list │
         * ├──────────┼─────────┤
         * │ "toys"   │ true    │
         * │ "books"  │ true    │
         * │ "food"   │ false   │
         * └──────────┴─────────┘
         */
        is_in(values: any[] | any) {
            return derive(this, (vArray, columns) => computeIsIn(vArray, columns, values, false));
        }

        /**
         * Checks if values are positive or negative Infinity.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ a: [1.5, Infinity, -Infinity] })
         * >>> df.with_columns($df.col("a").is_infinite().alias("inf"))
         * shape: (3, 2)
         * ┌───────────┬───────┐
         * │ a         │ inf   │
         * ├───────────┼───────┤
         * │ 1.5       │ false │
         * │ Infinity  │ true  │
         * │ -Infinity │ true  │
         * └───────────┴───────┘
         */
        is_infinite() {
            return derive(this, kleeneUnary((v) => v === Infinity || v === -Infinity));
        }


        /**
         * Checks if values are NaN.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ a: [1.5, NaN] })
         * >>> df.with_columns($df.col("a").is_nan().alias("nan"))
         * shape: (2, 2)
         * ┌─────┬───────┐
         * │ a   │ nan   │
         * ├─────┼───────┤
         * │ 1.5 │ false │
         * │ NaN │ true  │
         * └─────┴───────┘
         */
        is_nan() {
            return derive(this, kleeneUnary(Number.isNaN));
        }

        /**
         * Checks if values are not NaN.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ a: [1.5, NaN] })
         * >>> df.with_columns($df.col("a").is_not_nan().alias("not_nan"))
         * shape: (2, 2)
         * ┌─────┬─────────┐
         * │ a   │ not_nan │
         * ├─────┼─────────┤
         * │ 1.5 │ true    │
         * │ NaN │ false   │
         * └─────┴─────────┘
         */
        is_not_nan() {
            return derive(this, kleeneUnary((v) => !Number.isNaN(v)));
        }

        /**
         * Checks if column values are non-null and valid (not null, undefined, or missing).
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ email: ["alice@example.com", null] })
         * >>> df.with_columns($df.col("email").is_not_null().alias("valid"))
         * shape: (2, 2)
         * ┌───────────────────┬───────┐
         * │ email             │ valid │
         * ├───────────────────┼───────┤
         * │ alice@example.com │ true  │
         * │ null              │ false │
         * └───────────────────┴───────┘
         */
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

        /**
         * Checks if column values are null, undefined, or missing.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ email: ["alice@example.com", null] })
         * >>> df.with_columns($df.col("email").is_null().alias("missing"))
         * shape: (2, 2)
         * ┌───────────────────┬─────────┐
         * │ email             │ missing │
         * ├───────────────────┼─────────┤
         * │ alice@example.com │ false   │
         * │ null              │ true    │
         * └───────────────────┴─────────┘
         */
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

        /**
         * Checks if values occur exactly once in the column.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ a: [1, 2, 2] })
         * >>> df.with_columns($df.col("a").is_unique().alias("uniq"))
         * shape: (3, 2)
         * ┌───┬───────┐
         * │ a │ uniq  │
         * ├───┼───────┤
         * │ 1 │ true  │
         * │ 2 │ false │
         * │ 2 │ false │
         * └───┴───────┘
         */
        is_unique() {
            return derive(this, (vArray) => evaluateDuplication(vArray, false));
        }

        /**
         * Boolean comparison: Returns true if less than or equal to argument.
         * @param val The value or column expression to compare against.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ price: [40, 50, 60] })
         * >>> df.with_columns($df.col("price").le(50).alias("le_50"))
         * shape: (3, 2)
         * ┌───────┬───────┐
         * │ price │ le_50 │
         * ├───────┼───────┤
         * │ 40    │ true  │
         * │ 50    │ true  │
         * │ 60    │ false │
         * └───────┴───────┘
         */
        le(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v <= r));
        }

        /**
         * Boolean comparison: Returns true if less than argument.
         * @param val The value or column expression to compare against.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ price: [40, 50, 60] })
         * >>> df.with_columns($df.col("price").lt(50).alias("lt_50"))
         * shape: (3, 2)
         * ┌───────┬───────┐
         * │ price │ lt_50 │
         * ├───────┼───────┤
         * │ 40    │ true  │
         * │ 50    │ false │
         * │ 60    │ false │
         * └───────┴───────┘
         */
        lt(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v < r));
        }

        /**
         * Boolean comparison: Returns true if values do not match.
         * @param val The value or column expression to compare against.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ category: ["electronics", "toys"] })
         * >>> df.with_columns($df.col("category").ne("electronics").alias("not_elec"))
         * shape: (2, 2)
         * ┌─────────────┬──────────┐
         * │ category    │ not_elec │
         * ├─────────────┼──────────┤
         * │ electronics │ false    │
         * │ toys        │ true     │
         * └─────────────┴──────────┘
         */
        ne(val: any) {
            return derive(this, kleeneBinary(this, val, (v, r) => v !== r));
        }

        /**
         * Difference check that treats null values as equal to each other.
         * @param val The value or column expression to compare against.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ a: [1, null, 3] })
         * >>> df.with_columns($df.col("a").ne_missing(null).alias("not_missing"))
         * shape: (3, 2)
         * ┌──────┬─────────────┐
         * │ a    │ not_missing │
         * ├──────┼─────────────┤
         * │ 1    │ true        │
         * │ null │ false       │
         * │ 3    │ true        │
         * └──────┴─────────────┘
         */
        ne_missing(val: any) {
            return derive(this, (vArray, columns) => {
                const rResolved = this._resolve(val, columns, vArray.length);
                return compareMissing(vArray, rResolved, true);
            });
        }

        /**
         * Checks if values are not elements of a specific array or set list.
         * @param values An array of candidate values or a single value to match against.
         * @returns ColumnExpression
         * @example
         * >>> const df = $df.data({ category: ["toys", "books", "food"] })
         * >>> df.with_columns($df.col("category").not_in(["toys", "books"]).alias("not_in"))
         * shape: (3, 2)
         * ┌──────────┬────────┐
         * │ category │ not_in │
         * ├──────────┼────────┤
         * │ toys     │ false  │
         * │ books    │ false  │
         * │ food     │ true   │
         * └──────────┴────────┘
         */
        not_in(values: any[] | any) {
            return derive(this, (vArray, columns) => computeIsIn(vArray, columns, values, true));
        }

}
