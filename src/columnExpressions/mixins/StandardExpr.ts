import type {
    IExpr,
    AggFn,
    SkewOptions,
    KurtosisOptions,
    EntropyOptions,
    FillNullOptions,
    RollingOptions,
    ShiftOptions
} from "../../types"
import type { RandomOptions, NumericArg, IsCloseOptions } from "../types"
import { ExprBase } from "../ExprBase"
import { computeIsIn, compareMissing, computeRank, evaluateExpression } from "../utils"
import { ComputeError, InvalidArgumentError } from "../../exceptions"
import {
    clamp,
    computeBy,
    computeDotProduct,
    computeEntropy,
    computeKurtosis,
    computeMode,
    computeQuantile,
    computeSkewness,
    computeSpearmanCorrelation,
    computeStatisticalMatrix,
    computeWeightedAverage,
    filterByMask,
    getArrayElement,
    getArrayStats,
    getUniqueArrayStats,
    UniqueArrayStatsOptions,
    isArrayOfType,
    isArrayOrTypedArray,
    isValidNumber,
    mulberry32,
    reduceBitwise,
    roundToScale
} from "../../utils"

/**
 * @namespace $df.col
 * @category ColumnExpression
 * @syntax $df.col(<column_name>).{symbol}(...)
 */
export class StandardExpr extends ExprBase {

    _deriveAgg(fn: AggFn<any>) {
        const newInst = this._derive();
        newInst._aggFn = fn;
        newInst._groupingOpsIndex = this._ops.length;
        newInst._partitionOpsIndex = this._ops.length;
        return newInst;
    }

    _deriveAggBinary(other: any, fn: AggFn<[any, any]>) {
        const result = (this._deriveBinary(other, (x, y) => [x, y]) as any)._deriveAgg(fn);
        result._binaryMeta = undefined;
        return result;
    }

    get _isWindow(): boolean {
        return this._partitionBy !== null || this._evaluateWindow !== undefined || this._aggFn !== null;
    }

    _window(evaluateWindow: (groupPreValues: any[], partitionIndices: number[], currentIndex: number) => any) {
        const newInst = this._derive();
        newInst._partitionOpsIndex = this._ops.length;
        newInst._groupingOpsIndex = this._ops.length;
        newInst._evaluateWindow = evaluateWindow;
        return newInst;
    }

    _cum(
        reverse: boolean,
        initialVal: any,
        stepFn: (acc: any, val: any) => any,
        postFn?: (acc: any, hasValid: boolean) => any
    ) {
        return this._window((vals, _, currIdx) => {
            let acc = initialVal;
            let hasValid = false;
            const start = reverse ? currIdx : 0;
            const end = reverse ? vals.length - 1 : currIdx;
            for (let i = start; i <= end; i++) {
                const val = vals[i];
                if (val != null) {
                    acc = stepFn(acc, val);
                    hasValid = true;
                }
            }
            return postFn ? postFn(acc, hasValid) : acc;
        });
    }

    /**
     * Computes the absolute value of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").abs().alias("abs_a"))
     * shape: (3, 2)
     * ┌───┬───────┐
     * │ a │ abs_a │
     * ├───┼───────┤
     * │ 1 │ 1     │
     * │ 2 │ 2     │
     * │ 3 │ 3     │
     * └───┴───────┘
     */
    abs() {
        return this._deriveUnary(Math.abs);
    }

    /**
     * Adds a scalar value or another column expression.
     * @param val The number or column expression to add.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").add(10).alias("added"))
     * shape: (3, 2)
     * ┌───┬───────┐
     * │ a │ added │
     * ├───┼───────┤
     * │ 1 │ 11    │
     * │ 2 │ 12    │
     * │ 3 │ 13    │
     * └───┴───────┘
     */
    add(val: NumericArg) {
        return this._deriveBinary(val, (v, r) => v + r);
    }

    /**
     * Aggregation: Returns true if all values in the group are truthy.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_bool_4x2 -->
     * >>> df.select($df.col("a").all().alias("all_true"))
     * shape: (1, 1)
     * ┌──────────┐
     * │ all_true │
     * ├──────────┤
     * │ false    │
     * └──────────┘
     */
    all() {
        return this._deriveAgg(v => isArrayOfType(v, (x) => !!x, { mode: "every" }));
    }

    /**
     * Aggregation: Checks if all values in the group are null.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_nulls_3x2 -->
     * >>> df.select($df.col("a").allNull().alias("all_null"))
     * shape: (1, 1)
     * ┌──────────┐
     * │ all_null │
     * ├──────────┤
     * │ false    │
     * └──────────┘
     */
    allNull() {
        return this._deriveAgg(v => isArrayOfType(v, "nullish", { mode: "every" }));
    }

    /**
     * Logical AND check supporting Kleene logic.
     * @param other The other boolean column expression or literal value to compare.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_bool_4x2 -->
     * >>> df.withColumns($df.col("a").and($df.col("b")).alias("and_res"))
     * shape: (4, 3)
     * ┌───────┬───────┬─────────┐
     * │ a     │ b     │ and_res │
     * ├───────┼───────┼─────────┤
     * │ true  │ true  │ true    │
     * │ true  │ false │ false   │
     * │ false │ false │ false   │
     * │ null  │ true  │ null    │
     * └───────┴───────┴─────────┘
     */
    and(other: any) {
        return this._derive((vArray, columns) => {
            const height = vArray.length;
            const otherVal = this._resolve(other, columns, height);
            const isOtherArray = isArrayOrTypedArray(otherVal);
            const result = new Array(height);
            for (let i = 0; i < height; i++) {
                const v = vArray[i];
                const w = isOtherArray ? otherVal[i] : otherVal;
                if (v === false || w === false) result[i] = false;
                else if (v == null || w == null) result[i] = null;
                else result[i] = true;
            }
            return result;
        });
    }

    /**
     * Aggregation: Checks if any value in the group is truthy.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_bool_4x2 -->
     * >>> df.select($df.col("a").any().alias("any_true"))
     * shape: (1, 1)
     * ┌──────────┐
     * │ any_true │
     * ├──────────┤
     * │ true     │
     * └──────────┘
     */
    any() {
        return this._deriveAgg(v => isArrayOfType(v, (x) => !!x, { mode: "some" }));
    }

    /**
     * Aggregation: Checks if any value in the group is null.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_nulls_3x2 -->
     * >>> df.select($df.col("a").anyNull().alias("has_null"))
     * shape: (1, 1)
     * ┌──────────┐
     * │ has_null │
     * ├──────────┤
     * │ true     │
     * └──────────┘
     */
    anyNull() {
        return this._deriveAgg(v => isArrayOfType(v, "nullish", { mode: "some" }));
    }

    /**
     * Computes the mathematical arccosine (inverse cosine) of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").arccos().alias("arccos_a"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ arccos_a │
     * ├───┼──────────┤
     * │ 1 │ 0        │
     * │ 2 │ null     │
     * │ 3 │ null     │
     * └───┴──────────┘
     */
    arccos() {
        return this._deriveUnary((v) => Math.abs(v) > 1 ? null : Math.acos(v));
    }

    /**
     * Computes the hyperbolic arccosine of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").arccosh().alias("arccosh_a"))
     * shape: (3, 2)
     * ┌───┬───────────┐
     * │ a │ arccosh_a │
     * ├───┼───────────┤
     * │ 1 │ 0         │
     * │ 2 │ 1.316958  │
     * │ 3 │ 1.762747  │
     * └───┴───────────┘
     */
    arccosh() {
        return this._deriveUnary((v) => v < 1 ? null : Math.acosh(v));
    }

    /**
     * Computes the arcsine of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").arcsin().alias("arcsin_a"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ arcsin_a │
     * ├───┼──────────┤
     * │ 1 │ 1.570796 │
     * │ 2 │ null     │
     * │ 3 │ null     │
     * └───┴──────────┘
     */
    arcsin() {
        return this._deriveUnary((v) => Math.abs(v) > 1 ? null : Math.asin(v));
    }

    /**
     * Computes the hyperbolic arcsine of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").arcsinh().alias("arcsinh_a"))
     * shape: (3, 2)
     * ┌───┬───────────┐
     * │ a │ arcsinh_a │
     * ├───┼───────────┤
     * │ 1 │ 0.881374  │
     * │ 2 │ 1.443635  │
     * │ 3 │ 1.818446  │
     * └───┴───────────┘
     */
    arcsinh() {
        return this._deriveUnary(Math.asinh);
    }

    /**
     * Computes the arctangent of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").arctan().alias("arctan_a"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ arctan_a │
     * ├───┼──────────┤
     * │ 1 │ 0.785398 │
     * │ 2 │ 1.107149 │
     * │ 3 │ 1.249046 │
     * └───┴──────────┘
     */
    arctan() {
        return this._deriveUnary(Math.atan);
    }

    /**
     * Computes the quadrant-aware arctangent of two values.
     * @param val The x denominator number or column expression.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x2 -->
     * >>> df.withColumns($df.col("a").arctan2($df.col("b")).alias("arctan2_a"))
     * shape: (3, 3)
     * ┌───┬────┬───────────┐
     * │ a │ b  │ arctan2_a │
     * ├───┼────┼───────────┤
     * │ 1 │ 10 │ 0.099669  │
     * │ 2 │ 20 │ 0.099669  │
     * │ 3 │ 30 │ 0.099669  │
     * └───┴────┴───────────┘
     */
    arctan2(val: NumericArg) {
        return this._deriveBinary(val, Math.atan2);
    }

    /**
     * Computes the hyperbolic arctangent of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").arctanh().alias("arctanh_a"))
     * shape: (3, 2)
     * ┌───┬───────────┐
     * │ a │ arctanh_a │
     * ├───┼───────────┤
     * │ 1 │ null      │
     * │ 2 │ null      │
     * │ 3 │ null      │
     * └───┴───────────┘
     */
    arctanh() {
        return this._deriveUnary((v) => Math.abs(v) >= 1 ? null : Math.atanh(v));
    }

    /**
     * Aggregation: Finds the index of the maximum value in the group.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("val").argMax().alias("max_idx"))
     * shape: (1, 1)
     * ┌─────────┐
     * │ max_idx │
     * ├─────────┤
     * │ 2       │
     * └─────────┘
     */
    argMax() {
        return this._deriveAgg(v => getArrayStats(v).maxIdx);
    }

    /**
     * Aggregation: Finds the index of the minimum value in the group.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("val").argMin().alias("min_idx"))
     * shape: (1, 1)
     * ┌─────────┐
     * │ min_idx │
     * ├─────────┤
     * │ 0       │
     * └─────────┘
     */
    argMin() {
        return this._deriveAgg(v => getArrayStats(v).minIdx);
    }

    /**
     * Aggregation: Computes the arithmetic mean of the group.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").agg($df.col("val").avg().alias("mean"))
     * shape: (2, 2)
     * ┌───────┬──────┐
     * │ group │ mean │
     * ├───────┼──────┤
     * │ A     │ 15   │
     * │ B     │ 30   │
     * └───────┴──────┘
     */
    avg() {
        return this._deriveAgg(v => getArrayStats(v).mean);
    }

    /**
     * Checks if values fall inside lower and upper boundaries (inclusive).
     * @param lower The lower boundary value or expression.
     * @param upper The upper boundary value or expression.
     * @param closed Control boundary inclusivity: "both", "left", "right", or "none" (default: "both").
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x2 -->
     * >>> df.withColumns($df.col("a").between(1, 2).alias("in_range"))
     * shape: (3, 3)
     * ┌───┬────┬──────────┐
     * │ a │ b  │ in_range │
     * ├───┼────┼──────────┤
     * │ 1 │ 10 │ true     │
     * │ 2 │ 20 │ true     │
     * │ 3 │ 30 │ false    │
     * └───┴────┴──────────┘
     */
    between(lower: any, upper: any, closed: "both" | "left" | "right" | "none" = "both") {
        const lowerBound = (closed === "both" || closed === "left") ? this.ge(lower) : this.gt(lower);
        const upperBound = (closed === "both" || closed === "right") ? this.le(upper) : this.lt(upper);

        return lowerBound.and(upperBound);
    }

    /**
     * Aggregation: Computes bitwise AND across all elements in the group.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("a").bitwiseAnd().alias("res"))
     * shape: (1, 1)
     * ┌─────┐
     * │ res │
     * ├─────┤
     * │ 0   │
     * └─────┘
     */
    bitwiseAnd() {
        return this._deriveAgg(v => reduceBitwise(v, (a, b) => a & b));
    }

    /**
     * Aggregation: Computes bitwise OR across all elements in the group.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("a").bitwiseOr().alias("res"))
     * shape: (1, 1)
     * ┌─────┐
     * │ res │
     * ├─────┤
     * │ 3   │
     * └─────┘
     */
    bitwiseOr() {
        return this._deriveAgg(v => reduceBitwise(v, (a, b) => a | b));
    }

    /**
     * Aggregation: Computes bitwise XOR across all elements in the group.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("a").bitwiseXor().alias("res"))
     * shape: (1, 1)
     * ┌─────┐
     * │ res │
     * ├─────┤
     * │ 0   │
     * └─────┘
     */
    bitwiseXor() {
        return this._deriveAgg(v => reduceBitwise(v, (a, b) => a ^ b));
    }

    /**
     * Computes the cube root of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").cbrt().alias("cbrt_a"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ cbrt_a   │
     * ├───┼──────────┤
     * │ 1 │ 1        │
     * │ 2 │ 1.259921 │
     * │ 3 │ 1.44225  │
     * └───┴──────────┘
     */
    cbrt() {
        return this._deriveUnary(Math.cbrt);
    }

    /**
     * Rounds column values up to the nearest integer.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").ceil().alias("ceil_a"))
     * shape: (3, 2)
     * ┌───┬────────┐
     * │ a │ ceil_a │
     * ├───┼────────┤
     * │ 1 │ 1      │
     * │ 2 │ 2      │
     * │ 3 │ 3      │
     * └───┴────────┘
     */
    ceil() {
        return this._deriveUnary(Math.ceil);
    }

    /**
     * Clamps column values between lower and upper numeric thresholds.
     * @param lower The lower threshold value (default: null).
     * @param upper The upper threshold value (default: null).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").clip(2, 3).alias("clipped"))
     * shape: (3, 2)
     * ┌───┬─────────┐
     * │ a │ clipped │
     * ├───┼─────────┤
     * │ 1 │ 2       │
     * │ 2 │ 2       │
     * │ 3 │ 3       │
     * └───┴─────────┘
     */
    clip(lower: number | null = null, upper: number | null = null) {
        return this._deriveUnary((v) => clamp(v, { min: lower, max: upper }));
    }

    /**
     * Returns absolute value of expr with the sign of other.
     * @param val The sign source value or column expression.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x2 -->
     * >>> df.withColumns($df.col("a").copysign($df.col("b")).alias("signed"))
     * shape: (3, 3)
     * ┌───┬────┬────────┐
     * │ a │ b  │ signed │
     * ├───┼────┼────────┤
     * │ 1 │ 10 │ 1      │
     * │ 2 │ 20 │ 2      │
     * │ 3 │ 30 │ 3      │
     * └───┴────┴────────┘
     */
    copysign(val: NumericArg) {
        return this._deriveBinary(val, (v, r) => Math.abs(v) * (Math.sign(r) || 1));
    }

    /**
     * Aggregation: Computes the Pearson correlation coefficient between two columns.
     * @param other The target column expression to correlate with.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x2 -->
     * >>> df.select($df.col("a").corr($df.col("b")).alias("correlation"))
     * shape: (1, 1)
     * ┌─────────────┐
     * │ correlation │
     * ├─────────────┤
     * │ 1           │
     * └─────────────┘
     */
    corr(other: any) {
        return this._deriveAggBinary(other, pairs => computeStatisticalMatrix(pairs)?.correlation ?? null);
    }

    /**
     * Computes the cosine of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").cos().alias("cos_a"))
     * shape: (3, 2)
     * ┌───┬───────────┐
     * │ a │ cos_a     │
     * ├───┼───────────┤
     * │ 1 │ 0.540302  │
     * │ 2 │ -0.416147 │
     * │ 3 │ -0.989992 │
     * └───┴───────────┘
     */
    cos() {
        return this._deriveUnary(Math.cos);
    }

    /**
     * Computes the hyperbolic cosine of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").cosh().alias("cosh_a"))
     * shape: (3, 2)
     * ┌───┬───────────┐
     * │ a │ cosh_a    │
     * ├───┼───────────┤
     * │ 1 │ 1.543081  │
     * │ 2 │ 3.762196  │
     * │ 3 │ 10.067662 │
     * └───┴───────────┘
     */
    cosh() {
        return this._deriveUnary(Math.cosh);
    }

    /**
     * Computes the cotangent of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").cot().alias("cot_a"))
     * shape: (3, 2)
     * ┌───┬───────────┐
     * │ a │ cot_a     │
     * ├───┼───────────┤
     * │ 1 │ 0.642093  │
     * │ 2 │ -0.457658 │
     * │ 3 │ -7.015253 │
     * └───┴───────────┘
     */
    cot() {
        return this._deriveUnary((v) => {
            if (Number.isNaN(v)) return NaN;
            if (!isValidNumber(v)) return null;
            const tan = Math.tan(v);
            return tan === 0 ? null : 1 / tan;
        });
    }

    /**
     * Aggregation: Returns the count of records inside the group.
     * @param options Config flags including whether to count null values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").agg($df.col("val").count().alias("cnt"))
     * shape: (2, 2)
     * ┌───────┬─────┐
     * │ group │ cnt │
     * ├───────┼─────┤
     * │ A     │ 2   │
     * │ B     │ 1   │
     * └───────┴─────┘
     */
    count(options: { includeNulls?: boolean } = {}) {
        if (options.includeNulls) return this._deriveAgg(v => v.length);
        return this._deriveAgg(v => getArrayStats(v).count);
    }

    /**
     * Aggregation: Computes the covariance between two columns.
     * @param other The target column expression to compute covariance with.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x2 -->
     * >>> df.select($df.col("a").cov($df.col("b")).alias("covariance"))
     * shape: (1, 1)
     * ┌────────────┐
     * │ covariance │
     * ├────────────┤
     * │ 10         │
     * └────────────┘
     */
    cov(other: any) {
        return this._deriveAggBinary(other, pairs => computeStatisticalMatrix(pairs)?.covariance ?? null);
    }

    /**
     * Window: Computes cumulative count.
     * @param reverse Flag indicating whether to compute from reverse direction.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").cumCount().alias("c_count"))
     * shape: (3, 2)
     * ┌─────┬─────────┐
     * │ val │ c_count │
     * ├─────┼─────────┤
     * │ 10  │ 1       │
     * │ 20  │ 2       │
     * │ 30  │ 3       │
     * └─────┴─────────┘
     */
    cumCount(reverse: boolean = false) {
        return this._cum(reverse, 0, (acc) => acc + 1);
    }

    /**
     * Window: Computes cumulative maximum value.
     * @param reverse Flag indicating whether to compute in reverse direction.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").cumMax().alias("c_max"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ c_max │
     * ├─────┼───────┤
     * │ 10  │ 10    │
     * │ 20  │ 20    │
     * │ 30  │ 30    │
     * └─────┴───────┘
     */
    cumMax(reverse: boolean = false) {
        return this._cum(reverse, null, (acc, val) => (acc === null || val > acc ? val : acc));
    }

    /**
     * Window: Computes cumulative minimum value.
     * @param reverse Flag indicating whether to compute in reverse direction.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").cumMin().alias("c_min"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ c_min │
     * ├─────┼───────┤
     * │ 10  │ 10    │
     * │ 20  │ 10    │
     * │ 30  │ 10    │
     * └─────┴───────┘
     */
    cumMin(reverse: boolean = false) {
        return this._cum(reverse, null, (acc, val) => (acc === null || val < acc ? val : acc));
    }

    /**
     * Window: Computes cumulative product of values.
     * @param reverse Flag indicating whether to compute in reverse direction.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").cumProd().alias("c_prod"))
     * shape: (4, 2)
     * ┌───┬────────┐
     * │ a │ c_prod │
     * ├───┼────────┤
     * │ 1 │ 1      │
     * │ 2 │ 2      │
     * │ 3 │ 6      │
     * │ 4 │ 24     │
     * └───┴────────┘
     */
    cumProd(reverse: boolean = false) {
        return this._cum(reverse, 1, (acc, val) => acc * val, (acc, hasValid) => (hasValid ? acc : null));
    }

    /**
     * Window: Computes cumulative sum of values.
     * @param reverse Flag indicating whether to compute in reverse direction.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").cumSum().alias("c_sum"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ c_sum │
     * ├─────┼───────┤
     * │ 10  │ 10    │
     * │ 20  │ 30    │
     * │ 30  │ 60    │
     * └─────┴───────┘
     */
    cumSum(reverse: boolean = false) {
        return this._cum(reverse, 0, (acc, val) => acc + val);
    }

    /**
     * Converts angles from radians to degrees.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").degrees().alias("deg"))
     * shape: (3, 2)
     * ┌───┬────────────┐
     * │ a │ deg        │
     * ├───┼────────────┤
     * │ 1 │ 57.29578   │
     * │ 2 │ 114.591559 │
     * │ 3 │ 171.887339 │
     * └───┴────────────┘
     */
    degrees() {
        return this._deriveUnary((v) => v * (180 / Math.PI));
    }

    /**
     * Window: Computes dense rank (ranks without gaps) within group partition.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("score").denseRank().alias("dr"))
     * shape: (2, 2)
     * ┌───────┬────┐
     * │ score │ dr │
     * ├───────┼────┤
     * │ 75    │ 1  │
     * │ 95    │ 2  │
     * └───────┴────┘
     */
    denseRank() {
        return this.rank({ dense: true });
    }

    /**
     * Divides column values by a scalar or another column expression.
     * @param val The denominator value or column expression.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").div(2).alias("div_a"))
     * shape: (3, 2)
     * ┌───┬───────┐
     * │ a │ div_a │
     * ├───┼───────┤
     * │ 1 │ 0.5   │
     * │ 2 │ 1     │
     * │ 3 │ 1.5   │
     * └───┴───────┘
     */
    div(val: NumericArg) {
        return this._deriveBinary(val, (v, r) => r === 0 ? null : v / r);
    }

    /**
     * Aggregation: Computes the dot product with another column.
     * @param other The other column expression to compute the dot product with.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x2 -->
     * >>> df.select($df.col("a").dot($df.col("b")).alias("dot_product"))
     * shape: (1, 1)
     * ┌─────────────┐
     * │ dot_product │
     * ├─────────────┤
     * │ 140         │
     * └─────────────┘
     */
    dot(other: any) {
        return this._deriveAggBinary(other, pairs => computeDotProduct(pairs));
    }

    /**
     * Aggregation: Computes the Shannon entropy of a column or group.
     * @param options Entropy options ({ base?: number, normalize?: boolean }, default base=Math.E, normalize=true).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("a").entropy().alias("h"))
     * shape: (1, 1)
     * ┌──────────┐
     * │ h        │
     * ├──────────┤
     * │ 1.386294 │
     * └──────────┘
     */
    entropy(options: EntropyOptions = { base: Math.E, normalize: true }) {
        return this._deriveAgg(v => computeEntropy(v, options));
    }

    /**
     * Boolean comparison: Returns true if column values match the specified value exactly.
     * @param val The value or column expression to compare against.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").eq(2).alias("is_two"))
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
        return this._deriveBinary(val, (v, r) => v === r);
    }

    /**
     * Equivalence check that treats null values as equal to each other.
     * @param val The value or column expression to compare against.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_nulls_3x2 -->
     * >>> df.withColumns($df.col("a").eqMissing(null).alias("is_missing"))
     * shape: (3, 2)
     * ┌──────┬────────────┐
     * │ a    │ is_missing │
     * ├──────┼────────────┤
     * │ 1    │ false      │
     * │ null │ true       │
     * │ 3    │ false      │
     * └──────┴────────────┘
     */
    eqMissing(val: any) {
        return this._derive((vArray, columns) => {
            const rResolved = this._resolve(val, columns, vArray.length);
            return compareMissing(vArray, rResolved);
        });
    }

    /**
     * Computes natural exponent (e^x) of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").exp().alias("exp_a"))
     * shape: (3, 2)
     * ┌───┬───────────┐
     * │ a │ exp_a     │
     * ├───┼───────────┤
     * │ 1 │ 2.718282  │
     * │ 2 │ 7.389056  │
     * │ 3 │ 20.085537 │
     * └───┴───────────┘
     */
    exp() {
        return this._deriveUnary(Math.exp);
    }

    /**
     * Computes e^x - 1 for each element in the column.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").expm1().alias("expm1_a"))
     * shape: (3, 2)
     * ┌───┬───────────┐
     * │ a │ expm1_a   │
     * ├───┼───────────┤
     * │ 1 │ 1.718282  │
     * │ 2 │ 6.389056  │
     * │ 3 │ 19.085537 │
     * └───┴───────────┘
     */
    expm1() {
        return this._deriveUnary(Math.expm1);
    }

    /**
     * Replaces null, undefined, or missing values with a specified value or strategy.
     * @param options Configuration options including fill value, strategy ("forward", "backward", "zero", "one", "mean", "min", "max"), and optional limit.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_nulls_3x2 -->
     * >>> df.withColumns($df.col("a").fillNull({ value: 0 }).alias("filled"))
     * shape: (3, 2)
     * ┌──────┬────────┐
     * │ a    │ filled │
     * ├──────┼────────┤
     * │ 1    │ 1      │
     * │ null │ 0      │
     * │ 3    │ 3      │
     * └──────┴────────┘
     */
    fillNull({
        value = undefined,
        strategy = undefined,
        limit = undefined
    }: FillNullOptions = {}): this {
        if (strategy === "zero") value = 0;
        else if (strategy === "one") value = 1;

        return this._derive((vArray, columns) => {
            const height = vArray.length;
            const result = Array.from(vArray);

            if (strategy === "min" || strategy === "max" || strategy === "mean") {
                value = (getArrayStats(vArray) as any)[strategy];
            }

            if (value !== undefined) {
                const resolved = this._resolve(value, columns, height);
                const isArr = isArrayOrTypedArray(resolved);
                for (let i = 0; i < height; i++) {
                    if (result[i] == null) result[i] = isArr ? resolved[i] : resolved;
                }
                return result;
            }

            if (strategy === "forward" || strategy === "backward") {
                const isBwd = strategy === "backward";
                let lastVal: any = null, consec = 0;

                for (let i = 0; i < height; i++) {
                    const idx = isBwd ? height - 1 - i : i;
                    const val = result[idx];

                    if (val != null) {
                        lastVal = val;
                        consec = 0;
                    } else if (lastVal !== null && (limit === undefined || consec < limit)) {
                        result[idx] = lastVal;
                        consec++;
                    }
                }
                return result;
            }

            if (strategy !== undefined) {
                throw new InvalidArgumentError(`Unsupported fillNull strategy: "${strategy}"`);
            }

            return result;
        }) as this;
    }

    /**
     * Filters elements of the column expression where the predicate evaluates to truthy.
     * @param predicate Boolean column expression used to filter values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("a").filter($df.col("a").gt(1)).alias("filtered"))
     * shape: (2, 1)
     * ┌──────────┐
     * │ filtered │
     * ├──────────┤
     * │ 2        │
     * │ 3        │
     * └──────────┘
     */
    filter(predicate: IExpr) {
        return this._derive((vArray, columns) => {
            const mask = evaluateExpression(predicate, columns, vArray.length);
            return filterByMask(vArray, mask, { nullify: true });
        });
    }

    /**
     * Aggregation: Finds the first value in the group.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").agg($df.col("val").first().alias("first_val"))
     * shape: (2, 2)
     * ┌───────┬───────────┐
     * │ group │ first_val │
     * ├───────┼───────────┤
     * │ A     │ 10        │
     * │ B     │ 30        │
     * └───────┴───────────┘
     */
    first() {
        return this._deriveAgg(v => v[0] ?? null);
    }

    /**
     * Rounds column values down to the nearest integer.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").floor().alias("floor_a"))
     * shape: (3, 2)
     * ┌───┬─────────┐
     * │ a │ floor_a │
     * ├───┼─────────┤
     * │ 1 │ 1       │
     * │ 2 │ 2       │
     * │ 3 │ 3       │
     * └───┴─────────┘
     */
    floor() {
        return this._deriveUnary(Math.floor);
    }

    /**
     * Performs integer division floor(x / y) on column values.
     * @param val The divisor value or column expression.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").floordiv(2).alias("fdiv"))
     * shape: (3, 2)
     * ┌───┬──────┐
     * │ a │ fdiv │
     * ├───┼──────┤
     * │ 1 │ 0    │
     * │ 2 │ 1    │
     * │ 3 │ 1    │
     * └───┴──────┘
     */
    floordiv(val: NumericArg) {
        return this._deriveBinary(val, (v, r) => r === 0 ? null : Math.floor(v / r));
    }

    /**
     * Boolean comparison: Returns true if greater than or equal to argument.
     * @param val The value or column expression to compare against.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").ge(2).alias("ge_two"))
     * shape: (3, 2)
     * ┌───┬────────┐
     * │ a │ ge_two │
     * ├───┼────────┤
     * │ 1 │ false  │
     * │ 2 │ true   │
     * │ 3 │ true   │
     * └───┴────────┘
     */
    ge(val: any) {
        return this._deriveBinary(val, (v, r) => v >= r);
    }

    /**
     * Boolean comparison: Returns true if column value is greater than argument.
     * @param val The value or column expression to compare against.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").gt(2).alias("gt_two"))
     * shape: (3, 2)
     * ┌───┬────────┐
     * │ a │ gt_two │
     * ├───┼────────┤
     * │ 1 │ false  │
     * │ 2 │ false  │
     * │ 3 │ true   │
     * └───┴────────┘
     */
    gt(val: any) {
        return this._deriveBinary(val, (v, r) => v > r);
    }

    /**
     * Aggregation: Checks if any value in the group is null.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_nulls_3x2 -->
     * >>> df.select($df.col("a").hasNulls().alias("has_nulls"))
     * shape: (1, 1)
     * ┌───────────┐
     * │ has_nulls │
     * ├───────────┤
     * │ true      │
     * └───────────┘
     */
    hasNulls() {
        return this.anyNull();
    }

    /**
     * Computes the hypotenuse sqrt(x^2 + y^2) of two values.
     * @param val The other numeric value or column expression.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x2 -->
     * >>> df.withColumns($df.col("a").hypot($df.col("b")).alias("hypot_a"))
     * shape: (3, 3)
     * ┌───┬────┬───────────┐
     * │ a │ b  │ hypot_a   │
     * ├───┼────┼───────────┤
     * │ 1 │ 10 │ 10.049876 │
     * │ 2 │ 20 │ 20.099751 │
     * │ 3 │ 30 │ 30.149627 │
     * └───┴────┴───────────┘
     */
    hypot(val: NumericArg) {
        return this._deriveBinary(val, Math.hypot);
    }

    /**
     * Aggregation: Combines all values in the group into a single array/list cell.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").agg($df.col("val").implode().alias("list_val"))
     * shape: (2, 2)
     * ┌───────┬──────────┐
     * │ group │ list_val │
     * ├───────┼──────────┤
     * │ A     │ [10, 20] │
     * │ B     │ [30]     │
     * └───────┴──────────┘
     */
    implode() {
        return this._deriveAgg(v => v);
    }

    /**
     * Determines if floating-point values are approximately equal within tolerances.
     * @param other The value or expression to compare against.
     * @param options Tolerance values absolute (absTol) and relative (relTol), and NaN options.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").isClose(1.0).alias("close"))
     * shape: (3, 2)
     * ┌───┬───────┐
     * │ a │ close │
     * ├───┼───────┤
     * │ 1 │ true  │
     * │ 2 │ false │
     * │ 3 │ false │
     * └───┴───────┘
     */
    isClose(
        other: any,
        {
            absTol = 1e-8,
            relTol = 1e-8,
            nansEqual = false
        }: IsCloseOptions = {}
    ) {
        return this._deriveBinary(other, (v, o) => {
            if (isValidNumber(v) && isValidNumber(o)) {
                const absDiff = Math.abs(v - o);
                const threshold = Math.max(relTol * Math.max(Math.abs(v), Math.abs(o)), absTol);
                return absDiff <= threshold;
            }
            if (Number.isNaN(v) && Number.isNaN(o)) return nansEqual;
            return v === o;
        });
    }

    /**
     * Checks if values occur more than once in the column.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").isDuplicated().alias("dup"))
     * shape: (3, 2)
     * ┌───┬───────┐
     * │ a │ dup   │
     * ├───┼───────┤
     * │ 1 │ false │
     * │ 2 │ false │
     * │ 3 │ false │
     * └───┴───────┘
     */
    isDuplicated() {
        return this._derive((vArray) => {
            const { frequencies } = getUniqueArrayStats(vArray, { strict: true });
            const height = vArray.length;
            const result = new Array(height);
            for (let i = 0; i < height; i++) {
                result[i] = (frequencies.get(vArray[i]) || 0) > 1;
            }
            return result;
        });
    }


    /**
     * Checks if values are finite numbers (not NaN or Infinity).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").isFinite().alias("finite"))
     * shape: (3, 2)
     * ┌───┬────────┐
     * │ a │ finite │
     * ├───┼────────┤
     * │ 1 │ true   │
     * │ 2 │ true   │
     * │ 3 │ true   │
     * └───┴────────┘
     */
    isFinite() {
        return this._deriveUnary(Number.isFinite);
    }

    /**
     * Checks if column values are members of a specified array or list.
     * @param values An array of candidate values or a single value to match against.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").isIn(["apple", "banana"]).alias("in_list"))
     * shape: (3, 2)
     * ┌──────────┬─────────┐
     * │ s        │ in_list │
     * ├──────────┼─────────┤
     * │ "apple"  │ true    │
     * │ "banana" │ true    │
     * │ "cherry" │ false   │
     * └──────────┴─────────┘
     */
    isIn(values: any[] | any) {
        return this._derive((vArray, columns) => computeIsIn(vArray, columns, values));
    }

    /**
     * Checks if values are positive or negative Infinity.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").isInfinite().alias("inf"))
     * shape: (3, 2)
     * ┌───┬───────┐
     * │ a │ inf   │
     * ├───┼───────┤
     * │ 1 │ false │
     * │ 2 │ false │
     * │ 3 │ false │
     * └───┴───────┘
     */
    isInfinite() {
        return this._deriveUnary((v) => v === Infinity || v === -Infinity);
    }

    /**
     * Checks if values are NaN.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").isNan().alias("nan"))
     * shape: (3, 2)
     * ┌───┬───────┐
     * │ a │ nan   │
     * ├───┼───────┤
     * │ 1 │ false │
     * │ 2 │ false │
     * │ 3 │ false │
     * └───┴───────┘
     */
    isNan() {
        return this._deriveUnary(Number.isNaN);
    }

    /**
     * Checks if column values match the N-th distinct value by positive or negative index position.
     * @param index The 0-based or negative index position into the ordered distinct values (e.g. 0 for first distinct, -1 for last distinct).
     * @param nullOnOob If true, returns null if index is out of bounds (default: true).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x2 -->
     * >>> df.withColumns($df.col("a").isNDistinct(0).alias("is_first"))
     * shape: (3, 3)
     * ┌───┬────┬──────────┐
     * │ a │ b  │ is_first │
     * ├───┼────┼──────────┤
     * │ 1 │ 10 │ true     │
     * │ 2 │ 20 │ false    │
     * │ 3 │ 30 │ false    │
     * └───┴────┴──────────┘
     */
    isNDistinct(index: number, nullOnOob: boolean = true) {
        return this._derive((vArray, columns) => {
            const { values } = getUniqueArrayStats(vArray, { strict: true });
            const targetVal = getArrayElement(values, index, nullOnOob);
            return this.eq(targetVal).evaluate(columns, vArray.length);
        });
    }

    /**
     * Checks if values are not NaN.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").isNotNan().alias("not_nan"))
     * shape: (3, 2)
     * ┌───┬─────────┐
     * │ a │ not_nan │
     * ├───┼─────────┤
     * │ 1 │ true    │
     * │ 2 │ true    │
     * │ 3 │ true    │
     * └───┴─────────┘
     */
    isNotNan() {
        return this.isNan().not();
    }

    /**
     * Checks if column values are non-null and valid (not null, undefined, or missing).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_nulls_3x2 -->
     * >>> df.withColumns($df.col("a").isNotNull().alias("valid"))
     * shape: (3, 2)
     * ┌──────┬───────┐
     * │ a    │ valid │
     * ├──────┼───────┤
     * │ 1    │ true  │
     * │ null │ false │
     * │ 3    │ true  │
     * └──────┴───────┘
     */
    isNotNull() {
        return this.isNull().not();
    }

    /**
     * Checks if column values are null, undefined, or missing.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_nulls_3x2 -->
     * >>> df.withColumns($df.col("a").isNull().alias("missing"))
     * shape: (3, 2)
     * ┌──────┬─────────┐
     * │ a    │ missing │
     * ├──────┼─────────┤
     * │ 1    │ false   │
     * │ null │ true    │
     * │ 3    │ false   │
     * └──────┴─────────┘
     */
    isNull() {
        return this.eqMissing(null);
    }

    /**
     * Checks if values occur exactly once in the column.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").isUnique().alias("uniq"))
     * shape: (3, 2)
     * ┌───┬──────┐
     * │ a │ uniq │
     * ├───┼──────┤
     * │ 1 │ true │
     * │ 2 │ true │
     * │ 3 │ true │
     * └───┴──────┘
     */
    isUnique() {
        return this.isDuplicated().not();
    }

    /**
     * Aggregation: Computes the kurtosis (peakedness/tailedness) of a numeric column.
     * @param options Kurtosis calculation options ({ fisher?: boolean, bias?: boolean }, default fisher=true, bias=true).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("a").kurtosis().alias("kurt"))
     * shape: (1, 1)
     * ┌───────┐
     * │ kurt  │
     * ├───────┤
     * │ -1.36 │
     * └───────┘
     */
    kurtosis(options: KurtosisOptions = {}) {
        return this._deriveAgg(v => computeKurtosis(v, options));
    }

    /**
     * Window: Shifts values down by offset, filling missing slots with default value.
     * @param offset Number of rows to shift down (default 1).
     * @param options Shift options configuring fallback fillValue (default null).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").lag(1, { fillValue: 0 }).alias("prev"))
     * shape: (3, 2)
     * ┌─────┬──────┐
     * │ val │ prev │
     * ├─────┼──────┤
     * │ 10  │ 0    │
     * │ 20  │ 10   │
     * │ 30  │ 20   │
     * └─────┴──────┘
     */
    lag(offset: number = 1, options: ShiftOptions = {}) {
        const fillValue = options.fillValue ?? null;

        return this._window((vals, _, currIdx) => {
            const targetIndex = currIdx - offset;
            if (targetIndex >= 0 && targetIndex < vals.length) {
                const val = vals[targetIndex];
                return val === undefined ? fillValue : val;
            }
            return fillValue;
        });
    }

    /**
     * Aggregation: Finds the last value in the group.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").agg($df.col("val").last().alias("last_val"))
     * shape: (2, 2)
     * ┌───────┬──────────┐
     * │ group │ last_val │
     * ├───────┼──────────┤
     * │ A     │ 20       │
     * │ B     │ 30       │
     * └───────┴──────────┘
     */
    last() {
        return this._deriveAgg(v => v[v.length - 1] ?? null);
    }

    /**
     * Boolean comparison: Returns true if less than or equal to argument.
     * @param val The value or column expression to compare against.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").le(2).alias("le_two"))
     * shape: (3, 2)
     * ┌───┬────────┐
     * │ a │ le_two │
     * ├───┼────────┤
     * │ 1 │ true   │
     * │ 2 │ true   │
     * │ 3 │ false  │
     * └───┴────────┘
     */
    le(val: any) {
        return this._deriveBinary(val, (v, r) => v <= r);
    }

    /**
     * Window: Shifts values up by offset, filling missing slots with default value.
     * @param offset Number of rows to shift up (default 1).
     * @param options Shift options configuring fallback fillValue (default null).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").lead(1, { fillValue: 0 }).alias("next"))
     * shape: (3, 2)
     * ┌─────┬──────┐
     * │ val │ next │
     * ├─────┼──────┤
     * │ 10  │ 20   │
     * │ 20  │ 30   │
     * │ 30  │ 0    │
     * └─────┴──────┘
     */
    lead(offset: number = 1, options: ShiftOptions = {}) {
        return this.lag(-offset, options);
    }

    /**
     * Computes the logarithm of positive values with a specified base.
     * @param base The base of the logarithm (default: Math.E).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").log(10).alias("log_a"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ log_a    │
     * ├───┼──────────┤
     * │ 1 │ 0        │
     * │ 2 │ 0.30103  │
     * │ 3 │ 0.477121 │
     * └───┴──────────┘
     */
    log(base: number = Math.E) {
        return this._deriveUnary((v) => v <= 0 ? null : Math.log(v) / Math.log(base));
    }

    /**
     * Computes natural logarithm of 1 + x.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").log1p().alias("log1p_a"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ log1p_a  │
     * ├───┼──────────┤
     * │ 1 │ 0.693147 │
     * │ 2 │ 1.098612 │
     * │ 3 │ 1.386294 │
     * └───┴──────────┘
     */
    log1p() {
        return this._deriveUnary((v) => v <= -1 ? null : Math.log1p(v));
    }

    /**
     * Boolean comparison: Returns true if less than argument.
     * @param val The value or column expression to compare against.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").lt(2).alias("lt_two"))
     * shape: (3, 2)
     * ┌───┬────────┐
     * │ a │ lt_two │
     * ├───┼────────┤
     * │ 1 │ true   │
     * │ 2 │ false  │
     * │ 3 │ false  │
     * └───┴────────┘
     */
    lt(val: any) {
        return this._deriveBinary(val, (v, r) => v < r);
    }

    /**
     * Aggregation: Finds the maximum value in the group.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").agg($df.col("val").max().alias("max_val"))
     * shape: (2, 2)
     * ┌───────┬─────────┐
     * │ group │ max_val │
     * ├───────┼─────────┤
     * │ A     │ 20      │
     * │ B     │ 30      │
     * └───────┴─────────┘
     */
    max() {
        return this._deriveAgg(v => getArrayStats(v).max);
    }

    /**
     * Aggregation: Finds the value in this column corresponding to the maximum value in the `by` expression.
     * @param by Column or expression to order by.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.select($df.col("group").maxBy($df.col("val")).alias("top_group"))
     * shape: (1, 1)
     * ┌───────────┐
     * │ top_group │
     * ├───────────┤
     * │ B         │
     * └───────────┘
     */
    maxBy(by: any) {
        return this._deriveAggBinary(by, p => computeBy(p, "maxIdx"));
    }

    /**
     * Aggregation: Computes the arithmetic mean of elements in the group.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").agg($df.col("val").mean().alias("mean_val"))
     * shape: (2, 2)
     * ┌───────┬──────────┐
     * │ group │ mean_val │
     * ├───────┼──────────┤
     * │ A     │ 15       │
     * │ B     │ 30       │
     * └───────┴──────────┘
     */
    mean() {
        return this.avg();
    }

    /**
     * Aggregation: Computes the 50th percentile median.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").agg($df.col("val").median().alias("med"))
     * shape: (2, 2)
     * ┌───────┬─────┐
     * │ group │ med │
     * ├───────┼─────┤
     * │ A     │ 15  │
     * │ B     │ 30  │
     * └───────┴─────┘
     */
    median() {
        return this.quantile(0.5);
    }

    /**
     * Aggregation: Finds the minimum value in the group.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").agg($df.col("val").min().alias("min_val"))
     * shape: (2, 2)
     * ┌───────┬─────────┐
     * │ group │ min_val │
     * ├───────┼─────────┤
     * │ A     │ 10      │
     * │ B     │ 30      │
     * └───────┴─────────┘
     */
    min() {
        return this._deriveAgg(v => getArrayStats(v).min);
    }

    /**
     * Aggregation: Finds the value in this column corresponding to the minimum value in the `by` expression.
     * @param by Column or expression to order by.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.select($df.col("group").minBy($df.col("val")).alias("lowest_group"))
     * shape: (1, 1)
     * ┌──────────────┐
     * │ lowest_group │
     * ├──────────────┤
     * │ A            │
     * └──────────────┘
     */
    minBy(by: any) {
        return this._deriveAggBinary(by, p => computeBy(p, "minIdx"));
    }

    /**
     * Computes modulo remainder (x % y) of column values.
     * @param val The divisor value or column expression.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").mod(2).alias("mod_a"))
     * shape: (3, 2)
     * ┌───┬───────┐
     * │ a │ mod_a │
     * ├───┼───────┤
     * │ 1 │ 1     │
     * │ 2 │ 0     │
     * │ 3 │ 1     │
     * └───┴───────┘
     */
    mod(val: NumericArg) {
        return this._deriveBinary(val, (v, r) => r === 0 ? null : v % r);
    }

    /**
     * Aggregation: Finds the statistical mode (most frequent value).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.select($df.col("group").mode().alias("mode_group"))
     * shape: (1, 1)
     * ┌────────────┐
     * │ mode_group │
     * ├────────────┤
     * │ ["A"]      │
     * └────────────┘
     */
    mode() {
        return this._deriveAgg(v => computeMode(v));
    }

    /**
     * Multiplies column values by a scalar or another column expression.
     * @param val The multiplier value or column expression.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").mul(5).alias("multiplied"))
     * shape: (3, 2)
     * ┌───┬────────────┐
     * │ a │ multiplied │
     * ├───┼────────────┤
     * │ 1 │ 5          │
     * │ 2 │ 10         │
     * │ 3 │ 15         │
     * └───┴────────────┘
     */
    mul(val: NumericArg) {
        return this._deriveBinary(val, (v, r) => v * r);
    }

    /**
     * Aggregation: Finds the maximum value in the group, taking NaN values into account (NaN propagates).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("val").nanMax().alias("nan_max_val"))
     * shape: (1, 1)
     * ┌─────────────┐
     * │ nan_max_val │
     * ├─────────────┤
     * │ 30          │
     * └─────────────┘
     */
    nanMax() {
        return this._deriveAgg(v => getArrayStats(v).nanMax);
    }

    /**
     * Aggregation: Finds the minimum value in the group, taking NaN values into account (NaN propagates).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("val").nanMin().alias("nan_min_val"))
     * shape: (1, 1)
     * ┌─────────────┐
     * │ nan_min_val │
     * ├─────────────┤
     * │ 10          │
     * └─────────────┘
     */
    nanMin() {
        return this._deriveAgg(v => getArrayStats(v).nanMin);
    }

    /**
     * Boolean comparison: Returns true if values do not match.
     * @param val The value or column expression to compare against.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").ne(2).alias("not_two"))
     * shape: (3, 2)
     * ┌───┬─────────┐
     * │ a │ not_two │
     * ├───┼─────────┤
     * │ 1 │ true    │
     * │ 2 │ false   │
     * │ 3 │ true    │
     * └───┴─────────┘
     */
    ne(val: any) {
        return this.eq(val).not();
    }

    /**
     * Negates column values (-x).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").negate().alias("negated"))
     * shape: (3, 2)
     * ┌───┬─────────┐
     * │ a │ negated │
     * ├───┼─────────┤
     * │ 1 │ -1      │
     * │ 2 │ -2      │
     * │ 3 │ -3      │
     * └───┴─────────┘
     */
    negate() {
        return this._deriveUnary((v) => -v);
    }

    /**
     * Difference check that treats null values as equal to each other.
     * @param val The value or column expression to compare against.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_nulls_3x2 -->
     * >>> df.withColumns($df.col("a").neMissing(null).alias("not_missing"))
     * shape: (3, 2)
     * ┌──────┬─────────────┐
     * │ a    │ not_missing │
     * ├──────┼─────────────┤
     * │ 1    │ true        │
     * │ null │ false       │
     * │ 3    │ true        │
     * └──────┴─────────────┘
     */
    neMissing(val: any) {
        return this.eqMissing(val).not();
    }

    /**
     * Logical negation.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_bool_4x2 -->
     * >>> df.withColumns($df.col("a").not().alias("not_a"))
     * shape: (4, 3)
     * ┌───────┬───────┬───────┐
     * │ a     │ b     │ not_a │
     * ├───────┼───────┼───────┤
     * │ true  │ true  │ false │
     * │ true  │ false │ false │
     * │ false │ false │ true  │
     * │ null  │ true  │ null  │
     * └───────┴───────┴───────┘
     */
    not() {
        return this._deriveUnary((v) => !v);
    }

    /**
     * Checks if values are not elements of a specific array or set list.
     * @param values An array of candidate values or a single value to match against.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").notIn(["apple", "banana"]).alias("not_in"))
     * shape: (3, 2)
     * ┌──────────┬────────┐
     * │ s        │ not_in │
     * ├──────────┼────────┤
     * │ "apple"  │ false  │
     * │ "banana" │ false  │
     * │ "cherry" │ true   │
     * └──────────┴────────┘
     */
    notIn(values: any[] | any) {
        return this.isIn(values).not();
    }

    /**
     * Aggregation: Counts the number of null or missing records.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_nulls_3x2 -->
     * >>> df.select($df.col("a").nullCount().alias("nulls"))
     * shape: (1, 1)
     * ┌───────┐
     * │ nulls │
     * ├───────┤
     * │ 1     │
     * └───────┘
     */
    nullCount() {
        return this._deriveAgg(v => getArrayStats(v).nullCount);
    }

    /**
     * Aggregation: Computes number of unique elements.
     * @param options Uniqueness options.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.select($df.col("group").nUnique().alias("unique_cnt"))
     * shape: (1, 1)
     * ┌────────────┐
     * │ unique_cnt │
     * ├────────────┤
     * │ 2          │
     * └────────────┘
     */
    nUnique(options: UniqueArrayStatsOptions = {}) {
        return this._deriveAgg(v => getUniqueArrayStats(v, options).count);
    }

    /**
     * Logical OR check supporting Kleene logic.
     * @param other The other boolean column expression or literal value to compare.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_bool_4x2 -->
     * >>> df.withColumns($df.col("a").or($df.col("b")).alias("or_res"))
     * shape: (4, 3)
     * ┌───────┬───────┬────────┐
     * │ a     │ b     │ or_res │
     * ├───────┼───────┼────────┤
     * │ true  │ true  │ true   │
     * │ true  │ false │ true   │
     * │ false │ false │ false  │
     * │ null  │ true  │ true   │
     * └───────┴───────┴────────┘
     */
    or(other: any) {
        return this._derive((vArray, columns) => {
            const height = vArray.length;
            const otherVal = this._resolve(other, columns, height);
            const isOtherArray = isArrayOrTypedArray(otherVal);
            const result = new Array(height);
            for (let i = 0; i < height; i++) {
                const v = vArray[i];
                const w = isOtherArray ? otherVal[i] : otherVal;
                if (v === true || w === true) result[i] = true;
                else if (v == null || w == null) result[i] = null;
                else result[i] = false;
            }
            return result;
        });
    }

    /**
     * Executes a window aggregation partitioned by column keys.
     * @param columns Column expression or array of columns to partition by.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.withColumns($df.col("val").sum().over("group").alias("cat_sum"))
     * shape: (3, 3)
     * ┌───────┬─────┬─────────┐
     * │ group │ val │ cat_sum │
     * ├───────┼─────┼─────────┤
     * │ A     │ 10  │ 30      │
     * │ A     │ 20  │ 30      │
     * │ B     │ 30  │ 30      │
     * └───────┴─────┴─────────┘
     */
    over(columns: string | IExpr | (string | IExpr)[]) {
        const newInst = this._derive();
        const cols = Array.isArray(columns) ? columns : [columns];
        newInst._partitionBy = cols;
        return newInst;
    }

    /**
     * Raises column values to the specified power.
     * @param val The exponent power value or column expression.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").pow(2).alias("pow_a"))
     * shape: (3, 2)
     * ┌───┬───────┐
     * │ a │ pow_a │
     * ├───┼───────┤
     * │ 1 │ 1     │
     * │ 2 │ 4     │
     * │ 3 │ 9     │
     * └───┴───────┘
     */
    pow(val: NumericArg) {
        return this._deriveBinary(val, Math.pow);
    }

    /**
     * Aggregation: Computes the product of all elements in the group.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").agg($df.col("val").product().alias("p"))
     * shape: (2, 2)
     * ┌───────┬─────┐
     * │ group │ p   │
     * ├───────┼─────┤
     * │ A     │ 200 │
     * │ B     │ 30  │
     * └───────┴─────┘
     */
    product() {
        return this._deriveAgg(v => getArrayStats(v).product);
    }

    /**
     * Aggregation: Computes the specific quantile values (0.0 to 1.0).
     * @param q The quantile parameter value between 0.0 and 1.0.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("a").quantile(0.75).alias("q75"))
     * shape: (1, 1)
     * ┌──────┐
     * │ q75  │
     * ├──────┤
     * │ 3.25 │
     * └──────┘
     */
    quantile(q: number) {
        if (q < 0 || q > 1) throw new ComputeError("Quantile q must be between 0 and 1");
        return this._deriveAgg(v => computeQuantile(v, q));
    }

    /**
     * Converts angles from degrees to radians.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").radians().alias("rad"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ rad      │
     * ├───┼──────────┤
     * │ 1 │ 0.017453 │
     * │ 2 │ 0.034907 │
     * │ 3 │ 0.05236  │
     * └───┴──────────┘
     */
    radians() {
        return this._deriveUnary((v) => v * (Math.PI / 180));
    }

    /**
     * Fills sequence with pseudo-random generated floats or integers.
     * @param seed Optional seed to initialize the pseudo-random generator.
     * @param options Config options including min, max, and integer flag.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").rand(42, { min: 1, max: 10, integer: true }).alias("random"))
     * shape: (3, 2)
     * ┌───┬────────┐
     * │ a │ random │
     * ├───┼────────┤
     * │ 1 │ 7      │
     * │ 2 │ 8      │
     * │ 3 │ 6      │
     * └───┴────────┘
     */
    rand(seed?: number, { min = 0, max = 1, integer = false }: RandomOptions = {}) {
        return this._derive((vArray) => {
            const len = vArray.length;
            const out = new Float64Array(len);
            const rnd = seed !== undefined ? mulberry32(seed) : Math.random;
            const range = max - min;

            for (let i = 0; i < len; i++) {
                const raw = rnd();
                out[i] = integer ? Math.floor(raw * (range + 1)) + min : raw * range + min;
            }
            return out;
        });
    }

    /**
     * Window: Computes rank within group partition.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("score").rank().alias("rank"))
     * shape: (2, 2)
     * ┌───────┬──────┐
     * │ score │ rank │
     * ├───────┼──────┤
     * │ 75    │ 1    │
     * │ 95    │ 2    │
     * └───────┴──────┘
     */
    rank(options: { dense?: boolean } = {}) {
        return this._window((vals, _, currIdx) => computeRank(vals, vals[currIdx], options));
    }

    /**
     * Reverses the order of values in the column.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").reverse().alias("reversed"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ reversed │
     * ├───┼──────────┤
     * │ 1 │ 3        │
     * │ 2 │ 2        │
     * │ 3 │ 1        │
     * └───┴──────────┘
     */
    reverse(): this {
        return this._derive((vArray) => (vArray as any[]).slice().reverse()) as this;
    }

    /**
     * Window: Computes a rolling window reduction using a ColumnExpression or a custom callback function.
     * @param optionsOrWindowSize Window row count or RollingOptions configuration.
     * @param exprOrFn ColumnExpression to evaluate over each window slice, or a custom reducer function.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").rolling(2, $df.col("val").sum()).alias("r_sum"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ r_sum │
     * ├─────┼───────┤
     * │ 10  │ 10    │
     * │ 20  │ 30    │
     * │ 30  │ 50    │
     * └─────┴───────┘
     */
    rolling(
        optionsOrWindowSize: number | RollingOptions,
        exprOrFn: IExpr | ((vals: any[]) => any)
    ) {
        const win = Math.floor(typeof optionsOrWindowSize === "number" ? optionsOrWindowSize : optionsOrWindowSize?.windowSize);
        if (!(win >= 1)) {
            throw new InvalidArgumentError("rolling: windowSize must be a positive number >= 1");
        }
        if (typeof exprOrFn !== "function" && typeof (exprOrFn as any)?.evaluate !== "function") {
            throw new InvalidArgumentError("rolling: second argument must be a reducer function or ColumnExpression");
        }

        const col = (exprOrFn as any)._colName || (this as any)._colName || "val";
        const reducer: (vals: any[]) => any = typeof exprOrFn === "function"
            ? exprOrFn
            : (exprOrFn as any)._aggFn ?? ((vals) => {
                const res = evaluateExpression(exprOrFn, { [col]: vals }, vals.length);
                return Array.isArray(res) ? res[res.length - 1] : res;
            });

        return this._window((vals, _, currIdx) => reducer(vals.slice(Math.max(0, currIdx - win + 1), currIdx + 1)));
    }

    /**
     * Window: Computes rolling window maximum value.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").rollingMax(2).alias("r_max"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ r_max │
     * ├─────┼───────┤
     * │ 10  │ 10    │
     * │ 20  │ 20    │
     * │ 30  │ 30    │
     * └─────┴───────┘
     */
    rollingMax(windowSize: number) {
        return this.rolling(windowSize, v => getArrayStats(v).max);
    }

    /**
     * Window: Computes rolling window mean average.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").rollingMean(2).alias("r_mean"))
     * shape: (3, 2)
     * ┌─────┬────────┐
     * │ val │ r_mean │
     * ├─────┼────────┤
     * │ 10  │ 10     │
     * │ 20  │ 15     │
     * │ 30  │ 25     │
     * └─────┴────────┘
     */
    rollingMean(windowSize: number) {
        return this.rolling(windowSize, v => getArrayStats(v).mean);
    }

    /**
     * Window: Computes rolling window median value.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").rollingMedian(2).alias("r_med"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ r_med │
     * ├─────┼───────┤
     * │ 10  │ 10    │
     * │ 20  │ 15    │
     * │ 30  │ 25    │
     * └─────┴───────┘
     */
    rollingMedian(windowSize: number) {
        return this.rollingQuantile(0.5, windowSize);
    }

    /**
     * Window: Computes rolling window minimum value.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").rollingMin(2).alias("r_min"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ r_min │
     * ├─────┼───────┤
     * │ 10  │ 10    │
     * │ 20  │ 10    │
     * │ 30  │ 20    │
     * └─────┴───────┘
     */
    rollingMin(windowSize: number) {
        return this.rolling(windowSize, v => getArrayStats(v).min);
    }

    /**
     * Window: Computes rolling window quantile value.
     * @param quantile Quantile boundary between 0.0 and 1.0.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").rollingQuantile(0.5, 2).alias("r_quant"))
     * shape: (3, 2)
     * ┌─────┬─────────┐
     * │ val │ r_quant │
     * ├─────┼─────────┤
     * │ 10  │ 10      │
     * │ 20  │ 15      │
     * │ 30  │ 25      │
     * └─────┴─────────┘
     */
    rollingQuantile(quantile: number, windowSize: number) {
        return this.rolling(windowSize, v => computeQuantile(v, quantile));
    }

    /**
     * Window: Computes rolling window rank.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").rollingRank(2).alias("r_rank"))
     * shape: (3, 2)
     * ┌─────┬────────┐
     * │ val │ r_rank │
     * ├─────┼────────┤
     * │ 10  │ 1      │
     * │ 20  │ 2      │
     * │ 30  │ 2      │
     * └─────┴────────┘
     */
    rollingRank(windowSize: number) {
        return this.rolling(windowSize, (vals) => {
            return computeRank(vals, vals[vals.length - 1], { ignoreNulls: true });
        });
    }

    /**
     * Window: Computes rolling window standard deviation.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").rollingStd(2).alias("r_std"))
     * shape: (3, 2)
     * ┌─────┬────────┐
     * │ val │ r_std  │
     * ├─────┼────────┤
     * │ 10  │ 0      │
     * │ 20  │ 7.071  │
     * │ 30  │ 7.071  │
     * └─────┴────────┘
     */
    rollingStd(windowSize: number) {
        return this.rolling(windowSize, v => getArrayStats(v).std);
    }

    /**
     * Window: Computes rolling window sum.
     * @param windowSize Size of rolling window.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("val").rollingSum(2).alias("r_sum"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ val │ r_sum │
     * ├─────┼───────┤
     * │ 10  │ 10    │
     * │ 20  │ 30    │
     * │ 30  │ 50    │
     * └─────┴───────┘
     */
    rollingSum(windowSize: number) {
        return this.rolling(windowSize, v => getArrayStats(v).sum);
    }

    /**
     * Rounds values to a specific scale of decimal digits.
     * @param decimals Number of decimal places to round to (default: 0).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").round(1).alias("rounded"))
     * shape: (3, 2)
     * ┌───┬─────────┐
     * │ a │ rounded │
     * ├───┼─────────┤
     * │ 1 │ 1       │
     * │ 2 │ 2       │
     * │ 3 │ 3       │
     * └───┴─────────┘
     */
    round(decimals: number = 0) {
        return this._deriveUnary((v) => roundToScale(v, decimals));
    }

    /**
     * Rounds values to a specific number of significant figures.
     * @param sigFigs Number of significant figures.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").roundSigFigs(2).alias("sig_figs"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ sig_figs │
     * ├───┼──────────┤
     * │ 1 │ 1        │
     * │ 2 │ 2        │
     * │ 3 │ 3        │
     * └───┴──────────┘
     */
    roundSigFigs(sigFigs: number) {
        return this._deriveUnary((v) => isValidNumber(v) ? Number(v.toPrecision(sigFigs)) : v);
    }

    /**
     * Window: Computes 1-indexed row number count within group partitions.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.withColumns($df.col("val").rowNumber().over("group").alias("rn"))
     * shape: (3, 3)
     * ┌───────┬─────┬────┐
     * │ group │ val │ rn │
     * ├───────┼─────┼────┤
     * │ A     │ 10  │ 1  │
     * │ A     │ 20  │ 2  │
     * │ B     │ 30  │ 1  │
     * └───────┴─────┴────┘
     */
    rowNumber() {
        const inst = this._window((_, __, idx) => idx + 1);
        inst._outputName = "row_number";
        return inst;
    }

    /**
     * Shifts values by the given number of rows, filling newly introduced slots with null.
     * Positive offsets shift values down (lag); negative offsets shift values up (lead).
     * 
     * Supports windowing and partition grouping via `.over(...)`.
     * 
     * @param n Number of rows to shift (positive for down, negative for up). Default 1.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").shift(1).alias("shifted"))
     * shape: (3, 2)
     * ┌───┬─────────┐
     * │ a │ shifted │
     * ├───┼─────────┤
     * │ 1 │ null    │
     * │ 2 │ 1       │
     * │ 3 │ 2       │
     * └───┴─────────┘
     */
    shift(n: number = 1, options: ShiftOptions = {}) {
        return this.lag(Math.trunc(n) || 0, options);
    }

    /**
     * Returns sign indicator of column values (-1, 0, or 1).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").sign().alias("sign_a"))
     * shape: (3, 2)
     * ┌───┬────────┐
     * │ a │ sign_a │
     * ├───┼────────┤
     * │ 1 │ 1      │
     * │ 2 │ 1      │
     * │ 3 │ 1      │
     * └───┴────────┘
     */
    sign() {
        return this._deriveUnary(Math.sign);
    }

    /**
     * Computes the sine of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").sin().alias("sin_a"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ sin_a    │
     * ├───┼──────────┤
     * │ 1 │ 0.841471 │
     * │ 2 │ 0.909297 │
     * │ 3 │ 0.14112  │
     * └───┴──────────┘
     */
    sin() {
        return this._deriveUnary(Math.sin);
    }

    /**
     * Computes the hyperbolic sine of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").sinh().alias("sinh_a"))
     * shape: (3, 2)
     * ┌───┬───────────┐
     * │ a │ sinh_a    │
     * ├───┼───────────┤
     * │ 1 │ 1.175201  │
     * │ 2 │ 3.62686   │
     * │ 3 │ 10.017875 │
     * └───┴───────────┘
     */
    sinh() {
        return this._deriveUnary(Math.sinh);
    }

    /**
     * Aggregation: Computes the sample skewness as the Fisher-Pearson coefficient of skewness.
     * @param options Skew calculation options ({ bias?: boolean }, default bias=true).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("a").skew().alias("skewness"))
     * shape: (1, 1)
     * ┌──────────┐
     * │ skewness │
     * ├──────────┤
     * │ 0        │
     * └──────────┘
     */
    skew(options: SkewOptions = {}) {
        return this._deriveAgg(v => computeSkewness(v, options));
    }

    /**
     * Aggregation: Computes the Spearman rank correlation coefficient.
     * @param other The other column expression to correlate with.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x2 -->
     * >>> df.select($df.col("a").spearmanCorr($df.col("b")).alias("spearman"))
     * shape: (1, 1)
     * ┌──────────┐
     * │ spearman │
     * ├──────────┤
     * │ 1        │
     * └──────────┘
     */
    spearmanCorr(other: any) {
        return this._deriveAggBinary(other, pairs => computeSpearmanCorrelation(pairs));
    }

    /**
     * Computes the square root of non-negative column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").sqrt().alias("sqrt_a"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ sqrt_a   │
     * ├───┼──────────┤
     * │ 1 │ 1        │
     * │ 2 │ 1.414214 │
     * │ 3 │ 1.732051 │
     * └───┴──────────┘
     */
    sqrt() {
        return this._deriveUnary((v) => v < 0 ? null : Math.sqrt(v));
    }

    /**
     * Aggregation: Computes sample standard deviation.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("val").std().alias("std_dev"))
     * shape: (1, 1)
     * ┌─────────┐
     * │ std_dev │
     * ├─────────┤
     * │ 10      │
     * └─────────┘
     */
    std() {
        return this._deriveAgg(v => getArrayStats(v).std);
    }

    /**
     * Subtracts a scalar or another column expression.
     * @param val The value or column expression to subtract.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").sub(5).alias("sub_a"))
     * shape: (3, 2)
     * ┌───┬───────┐
     * │ a │ sub_a │
     * ├───┼───────┤
     * │ 1 │ -4    │
     * │ 2 │ -3    │
     * │ 3 │ -2    │
     * └───┴───────┘
     */
    sub(val: NumericArg) {
        return this._deriveBinary(val, (v, r) => v - r);
    }

    /**
     * Aggregation: Computes the sum of elements in the group.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_grouped_3x2 -->
     * >>> df.groupBy("group").agg($df.col("val").sum().alias("total"))
     * shape: (2, 2)
     * ┌───────┬───────┐
     * │ group │ total │
     * ├───────┼───────┤
     * │ A     │ 30    │
     * │ B     │ 30    │
     * └───────┴───────┘
     */
    sum() {
        return this._deriveAgg(v => getArrayStats(v).sum);
    }

    /**
     * Computes the tangent of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").tan().alias("tan_a"))
     * shape: (3, 2)
     * ┌───┬───────────┐
     * │ a │ tan_a     │
     * ├───┼───────────┤
     * │ 1 │ 1.557408  │
     * │ 2 │ -2.18504  │
     * │ 3 │ -0.142547 │
     * └───┴───────────┘
     */
    tan() {
        return this._deriveUnary(Math.tan);
    }

    /**
     * Computes the hyperbolic tangent of the column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").tanh().alias("tanh_a"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ tanh_a   │
     * ├───┼──────────┤
     * │ 1 │ 0.761594 │
     * │ 2 │ 0.964028 │
     * │ 3 │ 0.995055 │
     * └───┴──────────┘
     */
    tanh() {
        return this._deriveUnary(Math.tanh);
    }

    /**
     * Truncates fractional digits of column values.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.withColumns($df.col("a").trunc().alias("trunc_a"))
     * shape: (3, 2)
     * ┌───┬─────────┐
     * │ a │ trunc_a │
     * ├───┼─────────┤
     * │ 1 │ 1       │
     * │ 2 │ 2       │
     * │ 3 │ 3       │
     * └───┴─────────┘
     */
    trunc() {
        return this._deriveUnary(Math.trunc);
    }

    /**
     * Aggregation: Computes sample variance.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x1 -->
     * >>> df.select($df.col("val").variance().alias("v"))
     * shape: (1, 1)
     * ┌─────┐
     * │ v   │
     * ├─────┤
     * │ 100 │
     * └─────┘
     */
    variance() {
        return this._deriveAgg(v => getArrayStats(v).variance);
    }

    /**
     * Aggregation: Computes weighted average.
     * @param weights The weight values or column expression.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_numbers_3x2 -->
     * >>> df.select($df.col("a").wAvg($df.col("b")).alias("w_mean"))
     * shape: (1, 1)
     * ┌──────────┐
     * │ w_mean   │
     * ├──────────┤
     * │ 2.333333 │
     * └──────────┘
     */
    wAvg(weights: any) {
        return this._deriveAggBinary(weights, pairs => computeWeightedAverage(pairs));
    }

    /**
     * Logical XOR check.
     * @param other The other boolean column expression or literal value to compare.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_bool_4x2 -->
     * >>> df.withColumns($df.col("a").xor($df.col("b")).alias("xor_res"))
     * shape: (4, 3)
     * ┌───────┬───────┬─────────┐
     * │ a     │ b     │ xor_res │
     * ├───────┼───────┼─────────┤
     * │ true  │ true  │ false   │
     * │ true  │ false │ true    │
     * │ false │ true  │ true    │
     * │ false │ false │ false   │
     * └───────┴───────┴─────────┘
     */
    xor(other: any) {
        return this._deriveBinary(other, (v, w) => !!v !== !!w);
    }
}
