import type { RandomOptions, NumericArg } from "../types"
import { ExprBase, derive } from "../ExprBase"
import { kleeneUnary, kleeneBinary } from "../utils"
import { clamp, isValidNumber, mulberry32, roundToScale } from "../../utils"

export class ArithmeticExpr extends ExprBase {
    /**
     * Computes the absolute value of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [-1, 2, -3.5] })
     * >>> df.with_columns($df.col("a").abs().alias("abs_a"))
     * shape: (3, 2)
     * ┌──────┬───────┐
     * │ a    │ abs_a │
     * ├──────┼───────┤
     * │ -1   │ 1     │
     * │ 2    │ 2     │
     * │ -3.5 │ 3.5   │
     * └──────┴───────┘
     * @since v1.5.0
     */
    abs() {
        return derive(this, kleeneUnary(Math.abs));
    }

    /**
     * Computes the mathematical arccosine (inverse cosine) of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, 0.5, 1] })
     * >>> df.with_columns($df.col("a").acos().alias("acos_a"))
     * shape: (3, 2)
     * ┌─────┬───────────┐
     * │ a   │ acos_a    │
     * ├─────┼───────────┤
     * │ 0   │ 1.570796  │
     * │ 0.5 │ 1.047197  │
     * │ 1   │ 0         │
     * └─────┴───────────┘
     * @since v1.5.0
     */
    acos() {
        return derive(this, kleeneUnary((v) => (v < -1 || v > 1) ? null : Math.acos(v)));
    }

    /**
     * Computes the hyperbolic arccosine of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [1, 2, 5] })
     * >>> df.with_columns($df.col("a").acosh().alias("acosh_a"))
     * shape: (3, 2)
     * ┌───┬───────────┐
     * │ a │ acosh_a   │
     * ├───┼───────────┤
     * │ 1 │ 0         │
     * │ 2 │ 1.316957  │
     * │ 5 │ 2.292431  │
     * └───┴───────────┘
     * @since v1.5.0
     */
    acosh() {
        return derive(this, kleeneUnary((v) => v < 1 ? null : Math.acosh(v)));
    }

    /**
     * Adds a scalar value or another column expression.
     * @param val The number or column expression to add.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [1, 2, 3] })
     * >>> df.with_columns($df.col("a").add(10).alias("added"))
     * shape: (3, 2)
     * ┌───┬───────┐
     * │ a │ added │
     * ├───┼───────┤
     * │ 1 │ 11    │
     * │ 2 │ 12    │
     * │ 3 │ 13    │
     * └───┴───────┘
     * @since v1.5.0
     */
    add(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, (v, r) => v + r));
    }

    /**
     * Computes the arcsine of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, 0.5, 1] })
     * >>> df.with_columns($df.col("a").asin().alias("asin_a"))
     * shape: (3, 2)
     * ┌─────┬───────────┐
     * │ a   │ asin_a    │
     * ├─────┼───────────┤
     * │ 0   │ 0         │
     * │ 0.5 │ 0.523598  │
     * │ 1   │ 1.570796  │
     * └─────┴───────────┘
     * @since v1.5.0
     */
    asin() {
        return derive(this, kleeneUnary((v) => (v < -1 || v > 1) ? null : Math.asin(v)));
    }

    /**
     * Computes the hyperbolic arcsine of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, 1, 2] })
     * >>> df.with_columns($df.col("a").asinh().alias("asinh_a"))
     * shape: (3, 2)
     * ┌───┬───────────┐
     * │ a │ asinh_a   │
     * ├───┼───────────┤
     * │ 0 │ 0         │
     * │ 1 │ 0.881373  │
     * │ 2 │ 1.443635  │
     * └───┴───────────┘
     * @since v1.5.0
     */
    asinh() {
        return derive(this, kleeneUnary(Math.asinh));
    }

    /**
     * Computes the arctangent of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, 1, 2] })
     * >>> df.with_columns($df.col("a").atan().alias("atan_a"))
     * shape: (3, 2)
     * ┌───┬───────────┐
     * │ a │ atan_a    │
     * ├───┼───────────┤
     * │ 0 │ 0         │
     * │ 1 │ 0.785398  │
     * │ 2 │ 1.107148  │
     * └───┴───────────┘
     * @since v1.5.0
     */
    atan() {
        return derive(this, kleeneUnary(Math.atan));
    }

    /**
     * Computes the quadrant-aware arctangent of two values.
     * @param val The x denominator number or column expression.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [1, 2], b: [2, 1] })
     * >>> df.with_columns($df.col("a").atan2($df.col("b")).alias("atan2_a"))
     * shape: (2, 3)
     * ┌───┬───┬───────────┐
     * │ a │ b │ atan2_a   │
     * ├───┼───┼───────────┤
     * │ 1 │ 2 │ 0.463647  │
     * │ 2 │ 1 │ 1.107148  │
     * └───┴───┴───────────┘
     * @since v1.5.0
     */
    atan2(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, Math.atan2));
    }

    /**
     * Computes the hyperbolic arctangent of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, 0.5] })
     * >>> df.with_columns($df.col("a").atanh().alias("atanh_a"))
     * shape: (2, 2)
     * ┌─────┬───────────┐
     * │ a   │ atanh_a   │
     * ├─────┼───────────┤
     * │ 0   │ 0         │
     * │ 0.5 │ 0.549306  │
     * └─────┴───────────┘
     * @since v1.5.0
     */
    atanh() {
        return derive(this, kleeneUnary((v) => (v <= -1 || v >= 1) ? null : Math.atanh(v)));
    }

    /**
     * Computes the cube root of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [1, 8, 27] })
     * >>> df.with_columns($df.col("a").cbrt().alias("cbrt_a"))
     * shape: (3, 2)
     * ┌────┬────────┐
     * │ a  │ cbrt_a │
     * ├────┼────────┤
     * │ 1  │ 1      │
     * │ 8  │ 2      │
     * │ 27 │ 3      │
     * └────┴────────┘
     * @since v1.5.0
     */
    cbrt() {
        return derive(this, kleeneUnary(Math.cbrt));
    }

    /**
     * Rounds column values up to the nearest integer.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [1.1, 2.8, -0.5] })
     * >>> df.with_columns($df.col("a").ceil().alias("ceil_a"))
     * shape: (3, 2)
     * ┌──────┬────────┐
     * │ a    │ ceil_a │
     * ├──────┼────────┤
     * │ 1.1  │ 2      │
     * │ 2.8  │ 3      │
     * │ -0.5 │ 0      │
     * └──────┴────────┘
     * @since v1.5.0
     */
    ceil() {
        return derive(this, kleeneUnary(Math.ceil));
    }

    /**
     * Clamps column values between lower and upper numeric thresholds.
     * @param lower The lower threshold value (default: null).
     * @param upper The upper threshold value (default: null).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [5, 15, 25] })
     * >>> df.with_columns($df.col("a").clip(10, 20).alias("clipped"))
     * shape: (3, 2)
     * ┌────┬─────────┐
     * │ a  │ clipped │
     * ├────┼─────────┤
     * │ 5  │ 10      │
     * │ 15 │ 15      │
     * │ 25 │ 20      │
     * └────┴─────────┘
     * @since v1.6.0
     */
    clip(lower: number | null = null, upper: number | null = null) {
        return derive(this, kleeneUnary((v) => clamp(v, { min: lower, max: upper })));
    }

    /**
     * Returns absolute value of expr with the sign of other.
     * @param val The sign source value or column expression.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [5, 10], b: [-1, 1] })
     * >>> df.with_columns($df.col("a").copysign($df.col("b")).alias("signed"))
     * shape: (2, 3)
     * ┌────┬────┬────────┐
     * │ a  │ b  │ signed │
     * ├────┼────┼────────┤
     * │ 5  │ -1 │ -5     │
     * │ 10 │ 1  │ 10     │
     * └────┴────┴────────┘
     * @since v1.5.0
     */
    copysign(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, (v, r) => Math.abs(v) * (r >= 0 ? 1 : -1)));
    }

    /**
     * Computes the cosine of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, Math.PI] })
     * >>> df.with_columns($df.col("a").cos().alias("cos_a"))
     * shape: (2, 2)
     * ┌───────┬───────┐
     * │ a     │ cos_a │
     * ├───────┼───────┤
     * │ 0     │ 1     │
     * │ 3.141 │ -1    │
     * └───────┴───────┘
     * @since v1.5.0
     */
    cos() {
        return derive(this, kleeneUnary(Math.cos));
    }

    /**
     * Computes the hyperbolic cosine of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, 1] })
     * >>> df.with_columns($df.col("a").cosh().alias("cosh_a"))
     * shape: (2, 2)
     * ┌───┬───────────┐
     * │ a │ cosh_a    │
     * ├───┼───────────┤
     * │ 0 │ 1         │
     * │ 1 │ 1.543080  │
     * └───┴───────────┘
     * @since v1.5.0
     */
    cosh() {
        return derive(this, kleeneUnary(Math.cosh));
    }

    /**
     * Converts angles from radians to degrees.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, Math.PI] })
     * >>> df.with_columns($df.col("a").degrees().alias("deg"))
     * shape: (2, 2)
     * ┌───────┬─────┐
     * │ a     │ deg │
     * ├───────┼─────┤
     * │ 0     │ 0   │
     * │ 3.141 │ 180 │
     * └───────┴─────┘
     * @since v1.5.0
     */
    degrees() {
        return derive(this, kleeneUnary((v) => v * (180 / Math.PI)));
    }

    /**
     * Divides column values by a scalar or another column expression.
     * @param val The denominator value or column expression.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [10, 20, 30] })
     * >>> df.with_columns($df.col("a").div(2).alias("div_a"))
     * shape: (3, 2)
     * ┌────┬───────┐
     * │ a  │ div_a │
     * ├────┼───────┤
     * │ 10 │ 5     │
     * │ 20 │ 10    │
     * │ 30 │ 15    │
     * └────┴───────┘
     * @since v1.5.0
     */
    div(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, (v, r) => r === 0 ? null : v / r));
    }

    /**
     * Computes natural exponent (e^x) of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, 1, 2] })
     * >>> df.with_columns($df.col("a").exp().alias("exp_a"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ exp_a    │
     * ├───┼──────────┤
     * │ 0 │ 1        │
     * │ 1 │ 2.718281 │
     * │ 2 │ 7.389056 │
     * └───┴──────────┘
     * @since v1.5.0
     */
    exp() {
        return derive(this, kleeneUnary(Math.exp));
    }

    /**
     * Computes e^x - 1 for each element in the column.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, 1, 2] })
     * >>> df.with_columns($df.col("a").expm1().alias("expm1_a"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ expm1_a  │
     * ├───┼──────────┤
     * │ 0 │ 0        │
     * │ 1 │ 1.718281 │
     * │ 2 │ 6.389056 │
     * └───┴──────────┘
     * @since v1.5.0
     */
    expm1() {
        return derive(this, kleeneUnary(Math.expm1));
    }

    /**
     * Rounds column values down to the nearest integer.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [1.1, 2.8, -0.5] })
     * >>> df.with_columns($df.col("a").floor().alias("floor_a"))
     * shape: (3, 2)
     * ┌──────┬─────────┐
     * │ a    │ floor_a │
     * ├──────┼─────────┤
     * │ 1.1  │ 1       │
     * │ 2.8  │ 2       │
     * │ -0.5 │ -1      │
     * └──────┴─────────┘
     * @since v1.5.0
     */
    floor() {
        return derive(this, kleeneUnary(Math.floor));
    }

    /**
     * Performs integer division floor(x / y) on column values.
     * @param val The divisor value or column expression.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [5, 10, 15] })
     * >>> df.with_columns($df.col("a").floordiv(2).alias("fdiv"))
     * shape: (3, 2)
     * ┌────┬──────┐
     * │ a  │ fdiv │
     * ├────┼──────┤
     * │ 5  │ 2    │
     * │ 10 │ 5    │
     * │ 15 │ 7    │
     * └────┴──────┘
     * @since v1.5.0
     */
    floordiv(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, (v, r) => r === 0 ? null : Math.floor(v / r)));
    }

    /**
     * Computes the hypotenuse sqrt(x^2 + y^2) of two values.
     * @param val The other numeric value or column expression.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [3, 5], b: [4, 12] })
     * >>> df.with_columns($df.col("a").hypot($df.col("b")).alias("hypot_a"))
     * shape: (2, 3)
     * ┌───┬────┬─────────┐
     * │ a │ b  │ hypot_a │
     * ├───┼────┼─────────┤
     * │ 3 │ 4  │ 5       │
     * │ 5 │ 12 │ 13      │
     * └───┴────┴─────────┘
     * @since v1.5.0
     */
    hypot(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, Math.hypot));
    }

    /**
     * Computes the logarithm of positive values with a specified base.
     * @param base The base of the logarithm (default: Math.E).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [1, 10, 100] })
     * >>> df.with_columns($df.col("a").log(10).alias("log_a"))
     * shape: (3, 2)
     * ┌─────┬───────┐
     * │ a   │ log_a │
     * ├─────┼───────┤
     * │ 1   │ 0     │
     * │ 10  │ 1     │
     * │ 100 │ 2     │
     * └─────┴───────┘
     * @since v1.6.0
     */
    log(base: number = Math.E) {
        return derive(this, kleeneUnary((v) => v <= 0 ? null : (base === Math.E ? Math.log(v) : Math.log(v) / Math.log(base))));
    }

    /**
     * Computes natural logarithm of 1 + x.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, 1, 2] })
     * >>> df.with_columns($df.col("a").log1p().alias("log1p_a"))
     * shape: (3, 2)
     * ┌───┬──────────┐
     * │ a │ log1p_a  │
     * ├───┼──────────┤
     * │ 0 │ 0        │
     * │ 1 │ 0.693147 │
     * │ 2 │ 1.098612 │
     * └───┴──────────┘
     * @since v1.5.0
     */
    log1p() {
        return derive(this, kleeneUnary((v) => v <= -1 ? null : Math.log1p(v)));
    }

    /**
     * Computes modulo remainder (x % y) of column values.
     * @param val The divisor value or column expression.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [10, 11, 12] })
     * >>> df.with_columns($df.col("a").mod(2).alias("mod_a"))
     * shape: (3, 2)
     * ┌────┬───────┐
     * │ a  │ mod_a │
     * ├────┼───────┤
     * │ 10 │ 0     │
     * │ 11 │ 1     │
     * │ 12 │ 0     │
     * └────┴───────┘
     * @since v1.5.0
     */
    mod(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, (v, r) => r === 0 ? null : v % r));
    }

    /**
     * Multiplies column values by a scalar or another column expression.
     * @param val The multiplier value or column expression.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [1, 2, 3] })
     * >>> df.with_columns($df.col("a").mul(5).alias("multiplied"))
     * shape: (3, 2)
     * ┌───┬────────────┐
     * │ a │ multiplied │
     * ├───┼────────────┤
     * │ 1 │ 5          │
     * │ 2 │ 10         │
     * │ 3 │ 15         │
     * └───┴────────────┘
     * @since v1.5.0
     */
    mul(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, (v, r) => v * r));
    }

    /**
     * Negates column values (-x).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [1, -2, 3] })
     * >>> df.with_columns($df.col("a").negate().alias("negated"))
     * shape: (3, 2)
     * ┌────┬─────────┐
     * │ a  │ negated │
     * ├────┼─────────┤
     * │ 1  │ -1      │
     * │ -2 │ 2       │
     * │ 3  │ -3      │
     * └────┴─────────┘
     * @since v1.5.0
     */
    negate() {
        return derive(this, kleeneUnary((v) => -v));
    }

    /**
     * Raises column values to the specified power.
     * @param val The exponent power value or column expression.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [2, 3, 4] })
     * >>> df.with_columns($df.col("a").pow(2).alias("pow_a"))
     * shape: (3, 2)
     * ┌───┬───────┐
     * │ a │ pow_a │
     * ├───┼───────┤
     * │ 2 │ 4     │
     * │ 3 │ 9     │
     * │ 4 │ 16    │
     * └───┴───────┘
     * @since v1.5.0
     */
    pow(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, Math.pow));
    }

    /**
     * Converts angles from degrees to radians.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, 180] })
     * >>> df.with_columns($df.col("a").radians().alias("rad"))
     * shape: (2, 2)
     * ┌─────┬──────────┐
     * │ a   │ rad      │
     * ├─────┼──────────┤
     * │ 0   │ 0        │
     * │ 180 │ 3.141592 │
     * └─────┴──────────┘
     * @since v1.5.0
     */
    radians() {
        return derive(this, kleeneUnary((v) => v * (Math.PI / 180)));
    }

    /**
     * Fills sequence with pseudo-random generated floats or integers.
     * @param seed Optional seed to initialize the pseudo-random generator.
     * @param options Config options including min, max, and integer flag.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ index: [1, 2, 3] })
     * >>> df.with_columns($df.col("index").rand(42, { min: 1, max: 10, integer: true }).alias("random"))
     * shape: (3, 2)
     * ┌───────┬────────┐
     * │ index │ random │
     * ├───────┼────────┤
     * │ 1     │ 2      │
     * │ 2     │ 5      │
     * │ 3     │ 6      │
     * └───────┴────────┘
     * @since v1.6.0
     */
    rand(seed?: number, { min = 0, max = 1, integer = false }: RandomOptions = {}) {
        return derive(this, (vArray) => {
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
     * Rounds values to a specific scale of decimal digits.
     * @param decimals Number of decimal places to round to (default: 0).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [1.123, 2.789] })
     * >>> df.with_columns($df.col("a").round(2).alias("rounded"))
     * shape: (2, 2)
     * ┌───────┬─────────┐
     * │ a     │ rounded │
     * ├───────┼─────────┤
     * │ 1.123 │ 1.12    │
     * │ 2.789 │ 2.79    │
     * └───────┴─────────┘
     * @since v1.5.0
     */
    round(decimals: number = 0) {
        return derive(this, kleeneUnary((v) => roundToScale(v, decimals)));
    }

    /**
     * Rounds values to a specific number of significant figures.
     * @param sig_figs Number of significant figures.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [123.45, 0.006789] })
     * >>> df.with_columns($df.col("a").round_sig_figs(3).alias("sig_figs"))
     * shape: (2, 2)
     * ┌──────────┬──────────┐
     * │ a        │ sig_figs │
     * ├──────────┼──────────┤
     * │ 123.45   │ 123      │
     * │ 0.006789 │ 0.00679  │
     * └──────────┴──────────┘
     * @since v1.6.0
     */
    round_sig_figs(sig_figs: number) {
        return derive(this, kleeneUnary((v) => isValidNumber(v) ? Number(v.toPrecision(sig_figs)) : v));
    }

    /**
     * Returns sign indicator of column values (-1, 0, or 1).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [-10, 0, 50] })
     * >>> df.with_columns($df.col("a").sign().alias("sign_a"))
     * shape: (3, 2)
     * ┌─────┬────────┐
     * │ a   │ sign_a │
     * ├─────┼────────┤
     * │ -10 │ -1     │
     * │ 0   │ 0      │
     * │ 50  │ 1      │
     * └─────┴────────┘
     * @since v1.5.0
     */
    sign() {
        return derive(this, kleeneUnary(Math.sign));
    }

    /**
     * Computes the sine of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, Math.PI / 2] })
     * >>> df.with_columns($df.col("a").sin().alias("sin_a"))
     * shape: (2, 2)
     * ┌───────┬───────┐
     * │ a     │ sin_a │
     * ├───────┼───────┤
     * │ 0     │ 0     │
     * │ 1.570 │ 1     │
     * └───────┴───────┘
     * @since v1.5.0
     */
    sin() {
        return derive(this, kleeneUnary(Math.sin));
    }

    /**
     * Computes the hyperbolic sine of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, 1] })
     * >>> df.with_columns($df.col("a").sinh().alias("sinh_a"))
     * shape: (2, 2)
     * ┌───┬───────────┐
     * │ a │ sinh_a    │
     * ├───┼───────────┤
     * │ 0 │ 0         │
     * │ 1 │ 1.175201  │
     * └───┴───────────┘
     * @since v1.5.0
     */
    sinh() {
        return derive(this, kleeneUnary(Math.sinh));
    }

    /**
     * Computes the square root of non-negative column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [4, 9, 16] })
     * >>> df.with_columns($df.col("a").sqrt().alias("sqrt_a"))
     * shape: (3, 2)
     * ┌────┬────────┐
     * │ a  │ sqrt_a │
     * ├────┼────────┤
     * │ 4  │ 2      │
     * │ 9  │ 3      │
     * │ 16 │ 4      │
     * └────┴────────┘
     * @since v1.5.0
     */
    sqrt() {
        return derive(this, kleeneUnary((v) => v < 0 ? null : Math.sqrt(v)));
    }

    /**
     * Subtracts a scalar or another column expression.
     * @param val The value or column expression to subtract.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [10, 20, 30] })
     * >>> df.with_columns($df.col("a").sub(5).alias("sub_a"))
     * shape: (3, 2)
     * ┌────┬───────┐
     * │ a  │ sub_a │
     * ├────┼───────┤
     * │ 10 │ 5     │
     * │ 20 │ 15    │
     * │ 30 │ 25    │
     * └────┴───────┘
     * @since v1.5.0
     */
    sub(val: NumericArg) {
        return derive(this, kleeneBinary(this, val, (v, r) => v - r));
    }

    /**
     * Computes the tangent of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, Math.PI / 4] })
     * >>> df.with_columns($df.col("a").tan().alias("tan_a"))
     * shape: (2, 2)
     * ┌───────┬───────┐
     * │ a     │ tan_a │
     * ├───────┼───────┤
     * │ 0     │ 0     │
     * │ 0.785 │ 1     │
     * └───────┴───────┘
     * @since v1.5.0
     */
    tan() {
        return derive(this, kleeneUnary(Math.tan));
    }

    /**
     * Computes the hyperbolic tangent of the column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [0, 1] })
     * >>> df.with_columns($df.col("a").tanh().alias("tanh_a"))
     * shape: (2, 2)
     * ┌───┬───────────┐
     * │ a │ tanh_a    │
     * ├───┼───────────┤
     * │ 0 │ 0         │
     * │ 1 │ 0.761594  │
     * └───┴───────────┘
     * @since v1.5.0
     */
    tanh() {
        return derive(this, kleeneUnary(Math.tanh));
    }

    /**
     * Truncates fractional digits of column values.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ a: [1.1, 2.9, -3.5] })
     * >>> df.with_columns($df.col("a").trunc().alias("trunc_a"))
     * shape: (3, 2)
     * ┌──────┬─────────┐
     * │ a    │ trunc_a │
     * ├──────┼─────────┤
     * │ 1.1  │ 1       │
     * │ 2.9  │ 2       │
     * │ -3.5 │ -3      │
     * └──────┴─────────┘
     * @since v1.5.0
     */
    trunc() {
        return derive(this, kleeneUnary(Math.trunc));
    }
}
