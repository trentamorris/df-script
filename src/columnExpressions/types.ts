/** @typefile */
import type {
    AnyTypedArray,
    CentralMomentsOptions,
    ClosedBoundary,
    ColumnKeyArg,
    ColumnOrExprArg,
    DurationValueArg,
    IExpr,
    KurtosisOptions,
    ReplaceOptions,
    RowRecord,
    ScalarArg,
    StringEncoding,
    ValidScalarTypes
} from "../types";

/**
 * Operand for array-level operations (containsAll, containsAny, etc.).
 * Accepts an array of scalar values, a typed array, or another column expression.
 */
export type ArrayArg = IExpr | ValidScalarTypes[] | AnyTypedArray;

/**
 * Configuration options for range boundary comparison (`$df.col().between()`).
 */
export interface BetweenOptions {
    /**
     * Controls boundary inclusivity:
     * - `"both"`: `lower <= x <= upper` (default)
     * - `"left"`: `lower <= x < upper`
     * - `"right"`: `lower < x <= upper`
     * - `"none"`: `lower < x < upper`
     * @default "both"
     */
    closed?: ClosedBoundary;
}

/**
 * Operand for boolean logical operations (and, or, xor).
 * Accepts a boolean literal, boolean array, another column expression, or null.
 */
export type BooleanArg = ColumnKeyArg<boolean> | IExpr | null | undefined;

/**
 * Operand for equality and comparison expressions (eq, ne, eqMissing, neMissing).
 * Accepts another column expression, valid primitive scalar, or an array of scalar values.
 */
export type ComparisonArg = ScalarArg | ArrayArg;

/**
 * Configuration options for counting matching pattern occurrences in a string.
 */
export interface CountMatchesOptions {
    /**
     * If true, treats the pattern as a literal string rather than a regular expression.
     * @default false
     */
    literal?: boolean;
}

/**
 * Configuration options for counting elements (`$df.col().count()`).
 */
export interface CountOptions {
    /**
     * Whether to include `null`, `undefined`, or `NaN` values in the count.
     * When `false`, counts only non-null, valid elements.
     * @default false
     */
    includeNulls?: boolean;
}

/**
 * Configuration options for exponentially weighted moving kurtosis (`$df.col().ewmKurt()`).
 */
export type EwmKurtOptions = EwmOptions;

/**
 * Configuration options for exponentially weighted moving mean (`$df.col().ewmMean()`).
 */
export type EwmMeanOptions = Omit<EwmOptions, "bias" | "fisher">;

/**
 * Configuration options for Exponentially Weighted Moving (EWM) window operations.
 */
export interface EwmOptions extends CentralMomentsOptions, KurtosisOptions {
    /**
     * When `true`, divides by the decaying adjustment factor in beginning periods to account for imbalance in relative weightings.
     * @default true
     */
    adjust?: boolean;
    /**
     * Smoothing factor `alpha` directly in `(0, 1]`. Mutually exclusive with `span`, `halfLife`, and `com`.
     */
    alpha?: number;
    /**
     * When `false`, applies sample bias correction; when `true`, computes population moments without bias correction.
     * @default false
     */
    bias?: boolean;
    /**
     * Optional timestamp/index column name or expression used to scale `halfLife` decay by elapsed time deltas.
     */
    by?: ColumnOrExprArg;
    /**
     * Decay in terms of center of mass (`alpha = 1 / (1 + com)`), where `com >= 0`.
     */
    com?: number;
    /**
     * When `true` (default), computes excess kurtosis (Fisher's definition, subtracting 3.0); when `false`, computes Pearson's kurtosis.
     * @default true
     */
    fisher?: boolean;
    /**
     * Decay in terms of half-life (`alpha = 1 - exp(-ln(2) / halfLife)`), as a positive number or duration string.
     */
    halfLife?: DurationValueArg;
    /**
     * When `true`, ignores missing/null values when calculating weights; when `false`, weights decay across null positions.
     * @default false
     */
    ignoreNulls?: boolean;
    /**
     * Minimum number of non-null observations in window required to produce a value (otherwise `null`).
     * @default 1
     */
    minSamples?: number;
    /**
     * Decay in terms of span (`alpha = 2 / (span + 1)`), where `span >= 1`.
     */
    span?: number;
}

/**
 * Configuration options for exponentially weighted moving skewness (`$df.col().ewmSkew()`).
 */
export type EwmSkewOptions = Omit<EwmOptions, "fisher">;

/**
 * Configuration options for exponentially weighted moving standard deviation (`$df.col().ewmStd()`).
 */
export type EwmStdOptions = Omit<EwmOptions, "bias" | "fisher">;

/**
 * Configuration options for exponentially weighted moving sum (`$df.col().ewmSum()`).
 */
export type EwmSumOptions = Omit<EwmOptions, "adjust" | "bias" | "fisher">;

/**
 * Configuration options for exponentially weighted moving variance (`$df.col().ewmVar()`).
 */
export type EwmVarOptions = Omit<EwmOptions, "bias" | "fisher">;

/**
 * Configuration options for approximate floating-point equality comparison (`$df.col().isClose()`).
 */
export interface IsCloseOptions {
    /**
     * Non-negative absolute tolerance threshold.
     * @default 1e-8
     */
    absTol?: number;
    /**
     * When `true`, two `NaN` values are treated as close (`true`).
     * @default false
     */
    nansEqual?: boolean;
    /**
     * Non-negative relative tolerance threshold scaled by operand magnitude.
     * @default 1e-8
     */
    relTol?: number;
}

/**
 * Configuration options for checking whether column values match the N-th distinct value (`$df.col().isNDistinct()`).
 */
export interface IsNDistinctOptions {
    /**
     * If true (default), returns null when index is out of bounds.
     * If false, throws an error if index is out of bounds.
     * @default true
     */
    nullOnOob?: boolean;
}

/**
 * Operand for arithmetic expressions.
 * Accepts a literal number, bigint, another column expression, or null.
 */
export type NumericArg = number | bigint | IExpr | null;

/**
 * Operand for bivariate or series-level operations (corr, cov, dot, etc.).
 * Accepts a numeric column expression, numeric literal, numeric array, or numeric typed array.
 */
export type NumericSeriesArg = NumericArg | number[] | AnyTypedArray;

/**
 * Callback function for resolving dynamic property access on a delegating Proxy (`createDelegatingProxy`).
 */
export type ProxyPropertyResolver<T extends object> = (prop: string, target: T) => any;

/**
 * Configuration options for pseudo-random number generation (`$df.col().rand()`).
 */
export interface RandomOptions {
    /**
     * When `true`, generates random integers in `[min, max]`. When `false`, generates floating-point numbers in `[min, max)`.
     * @default false
     */
    integer?: boolean;
    /**
     * Maximum bound (exclusive for floats, inclusive for integers) for generated random values.
     * @default 1
     */
    max?: number;
    /**
     * Minimum bound (inclusive) for generated random values.
     * @default 0
     */
    min?: number;
}

/**
 * Configuration options for window rank calculation (`$df.col().rank()`).
 */
export interface RankOptions {
    /**
     * When true, ranks are consecutive integers without gaps between tied values (1, 2, 2, 3).
     * When false (default), ranks have gaps for tied values (1, 2, 2, 4).
     * @default false
     */
    dense?: boolean;
}

/**
 * Configuration options for replacing all matching occurrences in a string.
 * Omits the count limit `n` option present in `ReplaceOptions`.
 */
export type ReplaceAllOptions = Omit<ReplaceOptions, "n">;

/**
 * Configuration options for rolling window aggregations (`rollingMean`, `rollingSum`, `rollingMin`, `rollingMax`, `rollingStd`, `rollingVar`, etc.).
 */
export interface RollingOptions {
    /**
     * Number of consecutive elements in the moving window.
     */
    windowSize: number;
}

/**
 * Configuration options for shifting column or array elements (`shift`, `lag`, `lead`).
 */
export interface ShiftOptions {
    /**
     * Fallback fill value for empty slots introduced by shift/lag/lead.
     * @default null
     */
    fillValue?: any;
}

/**
 * Operand for string concatenation or text operations.
 * Accepts a string literal or another column expression.
 */
export type StringArg = ColumnOrExprArg<string>;

/**
 * Configuration options for decoding encoded string values (`$df.col().str.decode()`).
 */
export interface StringDecodeOptions extends StringEncodeOptions {
    /**
     * Whether invalid encoded sequences should throw an error (`true`) or return `null` (`false`).
     * @default true
     */
    strict?: boolean;
}

/**
 * Configuration options for encoding string values (`$df.col().str.encode()`).
 */
export interface StringEncodeOptions {
    /**
     * Target string encoding format (`"hex"` or `"base64"`).
     */
    encoding: StringEncoding;
}

/**
 * Operand for string replacement operations (replace, replaceAll).
 * Accepts a static replacement string or a dynamic replacer callback function.
 */
export type StringReplacementArg = string | StringReplacerFn;

/**
 * Operand for multiple string replacements (replaceMany).
 * Accepts an array of replacement strings or dynamic replacer callback functions.
 */
export type StringReplacementSeriesArg = StringReplacementArg[];

/**
 * Arguments passed to an ECMAScript string replacer callback after the matched substring.
 * Reuses RowRecord for named groups object, with scalar types for capture strings and offsets.
 */
export type StringReplacerArg = ValidScalarTypes | RowRecord;

/**
 * Dynamic callback for string replacements following ECMAScript String.prototype.replace standards.
 */
export type StringReplacerFn = (match: string, ...args: StringReplacerArg[]) => string;

/**
 * Configuration options for converting array/list elements into struct objects (`$df.col().arr.toStruct()`).
 */
export interface ToStructOptions {
    /**
     * Explicit array of struct field names or a callback `(idx: number) => string` generating field names by element index. Defaults to `"field_0"`, `"field_1"`, etc.
     */
    fields?: string[] | ((idx: number) => string);
    /**
     * Maximum number of array elements to extract into struct fields when `fields` is not an array. Defaults to the maximum array length in the column.
     */
    upperBound?: number;
}

/**
 * Unicode normalization form.
 * - `"NFC"`: Canonical Decomposition, followed by Canonical Composition (default)
 * - `"NFD"`: Canonical Decomposition
 * - `"NFKC"`: Compatibility Decomposition, followed by Canonical Composition
 * - `"NFKD"`: Compatibility Decomposition
 */
export type UnicodeNormalizeForm = "NFC" | "NFD" | "NFKC" | "NFKD";
