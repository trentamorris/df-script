/** @typefile */
import type { AnyTypedArray, JSONFormat } from "../types";
import type { INT_RANGES, BIGINT_RANGES } from "./number";

/**
 * Quantifier mode for array element type checking.
 */
export type ArrayCheckMode = "every" | "some";

/**
 * Target item type descriptor or predicate for `isArrayOfType()` and `toArrayOfType()`.
 */
export type ArrayItemType =
    | "string"
    | "number"
    | "int"
    | "boolean"
    | "bigint"
    | "object"
    | "plainObject"
    | "date"
    | "regexp"
    | "array"
    | "any"
    | "null"
    | "undefined"
    | "nullish"
    | (new (...args: any[]) => any)
    | ((v: unknown) => any);

/**
 * BigInt bounds specification: either a predefined `BigIntRangeType` name or an explicit `{ min, max }` object.
 */
export type BigIntRange =
    | {
        /** Minimum inclusive BigInt value. */
        min: bigint;
        /** Maximum inclusive BigInt value. */
        max: bigint;
    }
    | BigIntRangeType;

/**
 * Predefined 64-bit BigInt range identifier (`"Int64"` or `"UInt64"`).
 */
export type BigIntRangeType = keyof typeof BIGINT_RANGES;

/**
 * Configuration options for `binarySearch()`.
 */
export interface BinarySearchOptions<T = any> {
    /**
     * Optional accessor function `(index, item) => number` for indirect searching.
     */
    getValue?: (index: number, item: T) => number;
    /**
     * Search side: `"left"` (first index `>= target`) or `"right"` (first index `> target`).
     * @default "left"
     */
    side?: BinarySearchSide;
}

/**
 * Search boundary side for `binarySearch()`.
 */
export type BinarySearchSide = "left" | "right";

/**
 * Configuration options for binary buffer validation utilities.
 */
export interface BinaryValidationOptions {
    /**
     * When `true`, requires strict binary buffer type matching.
     * @default false
     */
    strict?: boolean;
}

/**
 * Internal regex match candidate used during multi-pattern string matching and replacement.
 * @internal
 */
export interface CandidateMatch<T = unknown> {
    /** Match end offset (exclusive) in the input string. */
    _end: number;
    /** Pattern index in the input pattern array. */
    _i: number;
    /** Extracted payload associated with the match. */
    _payload: T;
    /** Match start offset (inclusive) in the input string. */
    _start: number;
}

/**
 * Configuration options for `changeCase()`.
 */
export interface ChangeCaseOptions {
    /**
     * Target casing format: `"camel"`, `"kebab"`, `"pascal"`, `"snake"`, or `"title"`.
     */
    format: "camel" | "kebab" | "pascal" | "snake" | "title";
}

/**
 * Callback context passed to cumulative step functions in `fillSequence()` and `$df.seqRange()`.
 */
export interface CumulativeStepContext {
    /** The absolute index of the current element in the parent array. */
    absoluteIndex: number;
    /** The relative iteration counter of the stepping process (starts at 1). */
    index: number;
    /** The original value at the current index in the target array. */
    originalValue: any;
    /** The accumulated value returned by the step function from the previous stepped index. */
    prev: any;
    /** The entire target array being populated/modified. */
    targetArray: any;
}

/**
 * Internal date/time format and parse directive descriptor used by `strftime()` and `strptime()`.
 * @internal
 */
export interface DateDirective {
    /** Formats a `Date` and decomposed `DateTimeParts` into the directive's string representation. */
    _format: (d: Date, locale: string, timeZone: string, parts: import("../types").DateTimeParts) => string;
    /** Target date/time component field populated when this directive is parsed. */
    _parseField?: "year" | "month" | "day" | "hour" | "minute" | "second" | "ms" | "ampm" | "offset";
    /** Optional normalizer converting the matched substring into a numeric or string component value. */
    _parseNormalize?: (valStr: string) => number | string;
    /** Regular expression pattern source used to match the directive during `strptime()`. */
    _parseRegex?: string;
}

/**
 * Configuration options for fixed-point decimal validation and coercion (`isValidDecimal()`, `toValidDecimal()`).
 */
export interface DecimalOptions {
    /**
     * Total maximum number of significant digits (1 to 38).
     * @default 38
     */
    precision?: number;
    /**
     * Number of digits to the right of the decimal point (`0 <= scale <= precision`).
     * @default 9
     */
    scale?: number;
}

/**
 * Parsed calendar/clock/index duration interval components returned by `parseDurationInterval()`.
 */
export interface DurationInterval {
    /** Number of calendar days (`d`, `w`). */
    days: number;
    /** Number of row index units (`i`). */
    indexUnits: number;
    /** `true` if the interval contains calendar units (`months > 0` or `days > 0`). */
    isCalendar: boolean;
    /** `true` if the interval is measured in row index units (`i`). */
    isIndex: boolean;
    /** Number of calendar months (`mo`, `q`, `y`). */
    months: number;
    /** Number of sub-day milliseconds (`h`, `m`, `s`, `ms`, `us`, `ns`). */
    ms: number;
}

/**
 * Duration conversion target unit for `parseDurationString()` and `toDuration()`.
 */
export type DurationUnit = "ns" | "us" | "ms" | "s" | "m" | "h" | "d" | "w" | "mo" | "q" | "y" | "i";

/**
 * Base configuration options for `fillSequence()`.
 */
export interface FillSeqBaseOptions {
    /**
     * Type coercion helper applied to each generated value before writing.
     */
    coerce?: (v: any) => any;
    /**
     * Conditional predicate determining if a value should be written at a given index.
     */
    condition?: (v: any, index: number, array: any[]) => boolean;
    /**
     * Exclusive boundary index at which iteration and writing stops.
     */
    endIndex?: number;
    /**
     * If `true`, iterates and populates in reverse from `startIndex` down to `endIndex`.
     * @default false
     */
    reverse?: boolean;
    /**
     * Index at which array iteration and writing begins.
     * @default 0
     */
    startIndex?: number;
}

/**
 * Configuration options for `fillSequence()`.
 */
export interface FillSeqOptions extends FillSeqBaseOptions {
    /**
     * Type coercion helper applied to each generated value before writing.
     */
    coerce?: (v: any) => any;
    /**
     * Conditional predicate determining if a value should be written at a given index.
     */
    condition?: (v: any, index: number, array: any[]) => boolean;
    /**
     * Exclusive boundary index at which iteration and writing stops.
     */
    endIndex?: number;
    /**
     * Sequence generation mode: `"constant"`, `"cumulative"`, or `"independent"`.
     * @default "cumulative"
     */
    mode?: "constant" | "cumulative" | "independent";
    /**
     * If `true`, iterates and populates in reverse from `startIndex` down to `endIndex`.
     * @default false
     */
    reverse?: boolean;
    /**
     * Index at which array iteration and writing begins.
     * @default 0
     */
    startIndex?: number;
    /**
     * Step increment value or callback function.
     * @default 1
     */
    step?: number | ((context: CumulativeStepContext & IndependentStepContext) => any);
}

/**
 * Configuration options for `filterByMask()`.
 */
export interface FilterByMaskOptions {
    /**
     * If `true`, non-matching elements are replaced with `null` while preserving array length; if `false`, they are omitted.
     * @default false
     */
    nullify?: boolean;
}

/**
 * Configuration options for `isValidFloat()` and `toValidFloat()`.
 */
export interface FloatOptions extends ParseNumberOptions {
    /**
     * Whether `NaN` is considered a valid number.
     * @default false
     */
    allowNaN?: boolean;
    /**
     * Whether `Infinity` and `-Infinity` are considered valid numbers.
     * @default false
     */
    allowNonFiniteNumbers?: boolean;
    /**
     * Floating-point precision target (`"Float32"` or `"Float64"`).
     */
    floatPrecision?: FloatPrecision;
    /**
     * When `true`, allows scientific notation (e.g. `"1.5e3"`) when parsing numeric strings.
     * @default true
     */
    floatScientific?: boolean;
    /**
     * When `true`, rejects strings containing currency symbols, percent signs, or non-standard formatting.
     * @default false
     */
    strictNumericString?: boolean;
}

/**
 * Floating-point bit precision target.
 */
export type FloatPrecision = "Float32" | "Float64";

/**
 * Configuration options for `formatCSVValue()`.
 */
export interface FormatCSVValueOptions {
    /**
     * Custom `strftime` format string for `Date` values (e.g. `"%Y-%m-%d"`).
     */
    dateFormat?: string;
    /**
     * Custom `strftime` format string for `Datetime` values (e.g. `"%Y-%m-%d %H:%M:%S"`).
     */
    datetimeFormat?: string;
    /**
     * String representation to use for `null` or missing values.
     * @default ""
     */
    nullValue?: string;
    /**
     * Options for numeric formatting (floats, ints, bigints).
     */
    numericFormatOptions?: NumericFormatOptions;
    /**
     * Options for the safe JSON replacer used when formatting objects and arrays.
     */
    replacerOptions?: SafeJsonReplacerOptions;
    /**
     * Custom `strftime` format string for `Time` values (e.g. `"%H:%M:%S"`).
     */
    timeFormat?: string;
}

/**
 * Callback context passed to independent step functions in `fillSequence()` and `$df.seqRange()`.
 */
export interface IndependentStepContext {
    /** The absolute index of the current element in the parent array. */
    absoluteIndex: number;
    /** The relative iteration counter of the generation process (starts at 0). */
    index: number;
    /** The static starting value passed to the sequence generator. */
    initialValue: any;
    /** The original value at the current index in the target array. */
    originalValue: any;
    /** The entire target array being populated/modified. */
    targetArray: any;
}

/**
 * Rounding strategy for coercing floating-point numbers to integers.
 */
export type IntCoerceType = "round" | "floor" | "ceil" | "truncate";

/**
 * Configuration options for `isValidInt()` and `toValidInt()`.
 */
export interface IntOptions {
    /**
     * Rounding strategy used by `toValidInt()` when coercing fractional numbers.
     */
    coerce?: IntCoerceType;
    /**
     * Integer range bounds to validate against.
     */
    range?: IntRange;
}

/**
 * Integer bounds specification: either a predefined `IntRangeType` name or an explicit `{ min, max }` object.
 */
export type IntRange =
    | {
        /** Minimum inclusive integer value. */
        min: number;
        /** Maximum inclusive integer value. */
        max: number;
    }
    | IntRangeType;

/**
 * Predefined integer range identifier (`"Int8"`, `"Int16"`, `"Int32"`, `"UInt8"`, `"UInt16"`, `"UInt32"`).
 */
export type IntRangeType = keyof typeof INT_RANGES;

/**
 * Configuration options for `isArrayOfType()` and `toArrayOfType()`.
 */
export interface IsArrayOfTypeOptionsParams {
    /**
     * Whether an empty array is considered valid.
     * @default true
     */
    allowEmpty?: boolean;
    /**
     * Whether `null` and `undefined` elements are permitted without failing validation.
     * @default false
     */
    allowNulls?: boolean;
    /**
     * Optional custom coercion function applied to each element in `toArrayOfType()`.
     */
    coerce?: (v: unknown) => any;
    /**
     * Quantifier mode: `"every"` requires all elements to match; `"some"` requires at least one element to match.
     * @default "every"
     */
    mode?: ArrayCheckMode;
}

/**
 * Configuration options for `_isUnicodeSurrogate()`.
 */
export interface IsUnicodeSurrogateOptions {
    /**
     * Which surrogate code units to match: `"all"`, `"high"` (`0xD800..0xDBFF`), or `"low"` (`0xDC00..0xDFFF`).
     * @default "all"
     */
    type?: UnicodeSurrogateType;
}

/**
 * Configuration options for `isValidBigInt()`.
 */
export interface IsValidBigIntOptions {
    /**
     * 64-bit integer range bounds to validate against.
     * @default "Int64"
     */
    range?: BigIntRange;
}

/**
 * Configuration options for `joinArray()`.
 */
export interface JoinArrayOptions {
    /**
     * If `true`, `null` and `undefined` elements are skipped during joining.
     * @default false
     */
    ignoreNulls?: boolean;
    /**
     * Maximum number of array elements to join before truncating with `truncationMarker`.
     */
    limit?: number;
    /**
     * Custom string representation for `null` and `undefined` elements when `ignoreNulls` is `false`.
     * @default ""
     */
    nullValue?: string;
    /**
     * Prefix string prepended to the joined result.
     * @default ""
     */
    prefix?: string;
    /**
     * Suffix string appended to the joined result.
     * @default ""
     */
    suffix?: string;
    /**
     * Placeholder string appended when `limit` truncation occurs.
     * @default "..."
     */
    truncationMarker?: string;
    /**
     * Callback function used to format each non-null element to a string.
     */
    valueFormatter?: (val: any, index: number) => string;
}

/**
 * Configuration options for JSON and NDJSON parsing.
 */
export interface JSONParseOptions {
    /**
     * Whether to allow JSON primitive roots (numbers, booleans, strings, `null`) instead of requiring objects or arrays.
     * @default false
     */
    allowPrimitives?: boolean;
    /**
     * Format of the JSON content: `"json"` (standard JSON) or `"ndjson"` (Newline Delimited JSON).
     * @default "json"
     */
    format?: JSONFormat;
    /**
     * Options specific to NDJSON parsing when `format` is `"ndjson"`.
     */
    ndjson?: NDJSONParseOptions;
    /**
     * Reviver function passed to `JSON.parse` for custom value transformation.
     */
    reviver?: Parameters<typeof JSON.parse>[1];
    /**
     * Whether to trim leading and trailing whitespace before validating/parsing.
     * @default false
     */
    trimBeforeParse?: boolean;
}

/**
 * Parsed AST token representing a single evaluation step in a JSONPath expression.
 * @internal
 */
export interface JsonToken {
    /** Ending array index (exclusive). Used by `"slice"` tokens. */
    end?: number;
    /** Target index position. Used by `"idx"` tokens. Supports negative indices. */
    idx?: number;
    /** Property name or recursive search key. Used by `"prop"` and `"rec"` tokens. */
    key?: string;
    /** Starting array index (inclusive). Used by `"slice"` tokens. */
    start?: number;
    /** Increment step value. Used by `"slice"` tokens. Cannot be 0. */
    step?: number;
    /** The evaluation operation type. */
    type: JsonTokenType;
}

/**
 * JSONPath AST token operation kind.
 */
export type JsonTokenType =
    /** Selects an object property by name (e.g., `.foo` or `['foo']`). */
    | "prop"
    /** Selects a zero-based or negative array index (e.g., `[0]` or `[-1]`). */
    | "idx"
    /** Selects a range or stepped slice of an array (e.g., `[1:5:2]`). */
    | "slice"
    /** Selects all immediate properties of an object or elements of an array (e.g., `.*` or `[*]`). */
    | "wildcard"
    /** Recursively searches and collects matching keys down the hierarchy (e.g., `..foo`). */
    | "rec";

/**
 * Configuration options for NDJSON (Newline Delimited JSON) parsing.
 */
export interface NDJSONParseOptions {
    /**
     * Maximum number of non-empty lines to validate or parse.
     */
    maxLines?: number;
    /**
     * Skip malformed or invalid lines instead of failing the entire parse.
     * @default false
     */
    skipInvalidLines?: boolean;
    /**
     * Number of non-empty lines to skip at the beginning of the content.
     * @default 0
     */
    skipLines?: number;
}

/**
 * Configuration options for `formatNumber()`.
 */
export interface NumericFormatOptions extends Intl.NumberFormatOptions {
    /**
     * If `true`, formats negative numbers in accounting parentheses (e.g. `(1.23)`).
     * @default false
     */
    accountingNegatives?: boolean;
    /**
     * Fallback string returned when the value cannot be parsed into a formattable number.
     * @default "NaN"
     */
    fallback?: string;
    /**
     * If `true`, returns `fallback` for `Infinity` and `-Infinity` values.
     * @default false
     */
    formatNonFinite?: boolean;
    /**
     * BCP 47 language tag (e.g. `"en-US"`, `"de-DE"`).
     * @default "en-US"
     */
    locale?: string;
}

/**
 * Configuration options for `isValidNumber()`.
 */
export interface NumericValidationOptions {
    /**
     * Whether `NaN` is considered a valid number.
     * @default false
     */
    allowNaN?: boolean;
    /**
     * Whether `Infinity` and `-Infinity` are considered valid numbers.
     * @default false
     */
    allowNonFiniteNumbers?: boolean;
}

/**
 * Configuration options for `parseDurationString()`.
 */
export interface ParseDurationStringOptions {
    /**
     * Target unit to convert the parsed duration into.
     * @default "ms"
     */
    to?: DurationUnit;
}

/**
 * Configuration options for `toValidNumber()`.
 */
export interface ParseNumberOptions extends NumericValidationOptions {
    /**
     * Whether `NaN` is considered a valid number.
     * @default false
     */
    allowNaN?: boolean;
    /**
     * Whether `Infinity` and `-Infinity` are considered valid numbers.
     * @default false
     */
    allowNonFiniteNumbers?: boolean;
    /**
     * When `true`, allows scientific notation (e.g. `"1.5e3"`) when parsing numeric strings.
     * @default true
     */
    floatScientific?: boolean;
    /**
     * When `true`, rejects strings containing currency symbols, percent signs, or non-standard formatting.
     * @default false
     */
    strictNumericString?: boolean;
}

/**
 * Configuration options for `safeJsonParse()`.
 */
export interface SafeJsonParseOptions<T = unknown, F = T> extends JSONParseOptions {
    /**
     * Whether to allow JSON primitive roots (numbers, booleans, strings, `null`) instead of requiring objects or arrays.
     * @default false
     */
    allowPrimitives?: boolean;
    /**
     * Fallback value returned when parsing or guard validation fails.
     */
    fallback?: F;
    /**
     * Format of the JSON content: `"json"` (standard JSON) or `"ndjson"` (Newline Delimited JSON).
     * @default "json"
     */
    format?: JSONFormat;
    /**
     * Guard predicate to validate the parsed value. If it returns `false`, `onError` is called and `fallback` is returned.
     */
    guard?: ((value: unknown) => value is T) | ((value: unknown) => boolean);
    /**
     * Options specific to NDJSON parsing when `format` is `"ndjson"`.
     */
    ndjson?: NDJSONParseOptions;
    /**
     * Callback invoked when parsing fails or the `guard` check returns `false`.
     */
    onError?: (err: unknown) => void;
    /**
     * Reviver function passed to `JSON.parse` for custom value transformation.
     */
    reviver?: Parameters<typeof JSON.parse>[1];
    /**
     * Whether to trim leading and trailing whitespace before validating/parsing.
     * @default false
     */
    trimBeforeParse?: boolean;
}

/**
 * Configuration options for `createSafeJsonReplacer()`.
 */
export interface SafeJsonReplacerOptions {
    /**
     * Strategy for serializing `BigInt` values: `"string"` or `"number"`.
     * @default "string"
     */
    bigintStrategy?: "string" | "number";
    /** Custom formatter function for `Date` objects (ignored if `onDate` is specified). */
    formatDate?: (v: Date) => string;
    /**
     * If `true`, replaces circular references instead of throwing.
     * @default false
     */
    handleCircular?: boolean;
    /** Custom serialization override for `BigInt` values. */
    onBigInt?: (v: bigint) => any;
    /** Custom callback invoked when a circular reference is encountered. */
    onCircular?: (this: any, k: string, v: any) => any;
    /** Catch-all serialization override for custom types, executed after native type checks. */
    onCustom?: (this: any, k: string, v: any) => any;
    /** Custom serialization override for `Date` objects (takes precedence over `formatDate`). */
    onDate?: (v: Date) => any;
    /** Custom serialization override for `Error` objects. */
    onError?: (v: Error) => any;
    /** Custom serialization override for `Map` objects. */
    onMap?: (v: Map<any, any>) => any;
    /** Custom serialization override for `RegExp` objects. */
    onRegExp?: (v: RegExp) => any;
    /** Custom serialization override for `Set` objects. */
    onSet?: (v: Set<any>) => any;
    /** Custom serialization override for `TypedArray` values. */
    onTypedArray?: (v: any) => any;
    /** Custom serialization override for `URLSearchParams` objects. */
    onURLSearchParams?: (v: URLSearchParams) => any;
    /** Custom `JSON.stringify` replacer function or property whitelist array applied first. */
    replacer?: ((this: any, k: string, v: any) => any) | (string | number)[] | null;
    /**
     * If `true`, disables default safe serialization for `BigInt` values.
     * @default false
     */
    voidBigIntReplacement?: boolean;
    /**
     * If `true`, disables default safe serialization for `Date` objects.
     * @default false
     */
    voidDateReplacement?: boolean;
    /**
     * If `true`, disables default safe serialization for `Map` objects.
     * @default false
     */
    voidMapReplacement?: boolean;
    /**
     * If `true`, disables default safe serialization for `RegExp` objects.
     * @default false
     */
    voidRegExpReplacement?: boolean;
    /**
     * If `true`, disables default safe serialization for `Set` objects.
     * @default false
     */
    voidSetReplacement?: boolean;
    /**
     * If `true`, disables default safe serialization for `TypedArray` values.
     * @default false
     */
    voidTypedArrayReplacement?: boolean;
}

/**
 * Configuration options for `stepSliceArray()`.
 */
export interface StepSliceArrayOptions {
    /**
     * Maximum number of items to gather in the sliced result array.
     */
    maxItemsGathered?: number;
    /**
     * If `true`, returns `null` when the starting offset is out of bounds; if `false`, throws an error.
     * @default true
     */
    nullOnOob?: boolean;
    /**
     * Ending index (exclusive). Supports negative indices relative to array length.
     */
    offsetEnd?: number;
    /**
     * Starting index (inclusive). Supports negative indices relative to array length.
     * @default 0
     */
    offsetStart?: number;
    /**
     * Step size to slice the array by (non-zero). Positive slices forward; negative slices backward.
     * @default 1
     */
    step?: number;
}

/**
 * Configuration options for `stripChars()`.
 */
export interface StripCharsOptions {
    /**
     * Maximum number of non-contiguous matching blocks allowed to be stripped from the end (`-1` or `null` strips all).
     */
    maxMatchesEnd?: number | null;
    /**
     * Maximum number of non-contiguous matching blocks allowed to be stripped from the start (`-1` or `null` strips all).
     */
    maxMatchesStart?: number | null;
    /**
     * Maximum number of non-matching characters allowed to be skipped from the end before a match block is found (`-1` or `null` scans full length).
     */
    maxScanEnd?: number | null;
    /**
     * Maximum number of non-matching characters allowed to be skipped from the start before a match block is found (`-1` or `null` scans full length).
     */
    maxScanStart?: number | null;
    /**
     * Boundary strip mode: `"both"`, `"start"`, or `"end"`.
     * @default "both"
     */
    mode?: StripMode;
    /**
     * If `true`, returns `""` instead of `null` when the stripped result is empty or input is `null`.
     * @default false
     */
    returnStringOnNull?: boolean;
    /**
     * Options that apply only when `characters` is a string (and not a `RegExp`).
     */
    stringOptions?: {
        /**
         * If `true`, treats `characters` as a literal substring rather than a set of characters.
         * @default false
         */
        literal?: boolean;
        /**
         * If `true`, performs case-insensitive character and substring matching.
         * @default false
         */
        caseInsensitive?: boolean;
    };
    /**
     * If `true`, trims standard whitespace first before performing character stripping.
     * @default false
     */
    trimFirst?: boolean;
}

/**
 * Boundary side for `stripChars()`.
 */
export type StripMode = "both" | "start" | "end";

/**
 * Configuration options for `toDuration()`.
 */
export interface ToDurationOptions extends ParseDurationStringOptions {
    /**
     * Fallback numeric value returned when the input cannot be parsed as a valid duration.
     */
    fallback?: number;
    /**
     * Target unit to convert the parsed duration into.
     * @default "ms"
     */
    to?: DurationUnit;
}

/**
 * Configuration options for `toValidArray()`.
 */
export interface ToValidArrayOptions {
    /**
     * If `true`, returns a shallow copy of an existing array. If `false`, returns the input array directly without cloning.
     * @default true
     */
    clone?: boolean;
    /**
     * If `true`, wraps `null` or `undefined` into a single-element array. If `false`, returns an empty array `[]`.
     * @default false
     */
    wrapNull?: boolean;
}

/**
 * Configuration options for `toValidBigInt()`.
 */
export interface toValidBigIntOptions extends IsValidBigIntOptions {
    /**
     * 64-bit integer range bounds to validate against.
     * @default "Int64"
     */
    range?: BigIntRange;
    /**
     * When `true`, truncates fractional numbers/strings toward zero before converting to `bigint`.
     * @default false
     */
    truncate?: boolean;
}

/**
 * Constructor signature for a JavaScript TypedArray.
 */
export type TypedArrayConstructor<T extends AnyTypedArray = AnyTypedArray> = new (length: number) => T;

/**
 * Surrogate half selector for `_isUnicodeSurrogate()`.
 */
export type UnicodeSurrogateType = "all" | "high" | "low";

/**
 * Configuration options for `getUniqueArrayStats()`.
 */
export interface UniqueArrayStatsOptions {
    /**
     * Custom function to extract a unique comparison key from each element.
     */
    keySelector?: (val: any) => any;
    /**
     * If `true`, uses canonical serialization to group nested structures (Arrays, Sets, Maps, Dates) by value instead of reference.
     * @default false
     */
    strict?: boolean;
}

/**
 * Configuration options for `writeCSV()` and `df.writeCsv()`.
 */
export interface WriteCSVOptions extends FormatCSVValueOptions {
    /**
     * Custom `strftime` format string for `Date` values (e.g. `"%Y-%m-%d"`).
     */
    dateFormat?: string;
    /**
     * Custom `strftime` format string for `Datetime` values (e.g. `"%Y-%m-%d %H:%M:%S"`).
     */
    datetimeFormat?: string;
    /**
     * Whether to include a UTF-8 Byte Order Mark (BOM) at the start of the output.
     * @default false
     */
    includeBom?: boolean;
    /**
     * Whether to write the header row.
     * @default true
     */
    includeHeader?: boolean;
    /**
     * String used to terminate each row.
     * @default "\n"
     */
    lineTerminator?: string;
    /**
     * String representation to use for `null` or missing values.
     * @default ""
     */
    nullValue?: string;
    /**
     * Options for numeric formatting (floats, ints, bigints).
     */
    numericFormatOptions?: NumericFormatOptions;
    /**
     * Single-character quote symbol used for quoting fields.
     * @default '"'
     */
    quoteChar?: string;
    /**
     * Quoting strategy for CSV fields: `"necessary"`, `"always"`, `"never"`, or `"non_numeric"`.
     * @default "necessary"
     */
    quoteStyle?: "necessary" | "always" | "never" | "non_numeric";
    /**
     * Options for the safe JSON replacer used when formatting objects and arrays.
     */
    replacerOptions?: SafeJsonReplacerOptions;
    /**
     * Single-character delimiter that separates fields.
     * @default ","
     */
    separator?: string;
    /**
     * Custom `strftime` format string for `Time` values (e.g. `"%H:%M:%S"`).
     */
    timeFormat?: string;
}
