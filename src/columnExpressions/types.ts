/** @typefile */
import type { IExpr, ValidScalarTypes, AnyTypedArray, RowRecord , ReplaceOptions , IntoExprSeriesArg, ExprDict } from "../types";

export type ExprConstructor = new (...args: any[]) => IExpr;

export interface RandomOptions {
    min?: number;
    max?: number;
    integer?: boolean;
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
 * Operand for boolean logical operations (and, or, xor).
 * Accepts a boolean literal, another column expression, or null.
 */
export type BooleanArg = boolean | boolean[] | IExpr | null | undefined;

/**
 * Operand for scalar-level operations (contains, countMatches, etc.).
 * Accepts another column expression or any valid scalar value.
 */
export type ScalarArg = IExpr | ValidScalarTypes;

/**
 * Operand for array-level operations (containsAll, containsAny, etc.).
 * Accepts an array of scalar values, a typed array, or another column expression.
 */
export type ArrayArg = IExpr | ValidScalarTypes[] | AnyTypedArray;

/**
 * Operand for equality and comparison expressions (eq, ne, eqMissing, neMissing).
 * Accepts another column expression, valid primitive scalar, or an array of scalar values.
 */
export type ComparisonArg = ScalarArg | ArrayArg;

/**
 * Operand for string concatenation or text operations.
 * Accepts a string literal or another column expression.
 */
export type StringArg = string | IExpr;

/**
 * Operand for substring matching or regular expression evaluation.
 * Accepts a substring string or a compiled RegExp object.
 */
export type RegexPatternArg = string | RegExp;

/**
 * Operand for multi-pattern regular expression matching.
 * Accepts an array of substring strings or compiled RegExp objects.
 */
export type RegexPatternSeriesArg = RegexPatternArg[];

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
 * Configuration options for replacing all matching occurrences in a string.
 * Omits the count limit `n` option present in `ReplaceOptions`.
 */
export type ReplaceAllOptions = Omit<ReplaceOptions, "n">;

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
 * Unicode normalization form.
 * - `"NFC"`: Canonical Decomposition, followed by Canonical Composition (default)
 * - `"NFD"`: Canonical Decomposition
 * - `"NFKC"`: Compatibility Decomposition, followed by Canonical Composition
 * - `"NFKD"`: Compatibility Decomposition
 */
export type UnicodeNormalizeForm = "NFC" | "NFD" | "NFKC" | "NFKD";

/**
 * Operand for struct field updates and additions (struct.withFields, $df.struct).
 * Accepts an array of named expressions or an object dictionary mapping field names to expressions.
 */
export type StructFieldsArg = IntoExprSeriesArg | ExprDict;




export interface IsNDistinctOptions {
    /**
     * If true (default), returns null when index is out of bounds.
     * If false, throws an error if index is out of bounds.
     * @default true
     */
    nullOnOob?: boolean;
}

export interface RankOptions {
    /**
     * When true, ranks are consecutive integers without gaps between tied values (1, 2, 2, 3).
     * When false (default), ranks have gaps for tied values (1, 2, 2, 4).
     * @default false
     */
    dense?: boolean;
}

export interface IsCloseOptions {
    absTol?: number;
    relTol?: number;
    nansEqual?: boolean;
}

export interface CountOptions {
    /**
     * Whether to include `null`, `undefined`, or `NaN` values in the count.
     * When `false`, counts only non-null, valid elements.
     * @default false
     */
    includeNulls?: boolean;
}

/**
 * Inclusivity mode for interval boundaries.
 */
export type ClosedBoundary = "both" | "left" | "right" | "none";

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

export type ProxyPropertyResolver<T extends object> = (prop: string, target: T) => any;