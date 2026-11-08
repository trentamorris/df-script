/** @typefile */
import type { DataFrame } from "./dataframe/dataframe";
import type { RegisteredDataType } from "./datatypes";
import type { DataType } from "./datatypes/dataType";
import type { JSONParseOptions, NDJSONParseOptions } from "./utils";

/**
 * Aggregation function mapping an array of column values to a single scalar or summary value.
 */
export type AggFn<V, R = any> = (values: V[]) => R;

/**
 * Union of all standard JavaScript TypedArray instances.
 */
export type AnyTypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array
    | BigInt64Array
    | BigUint64Array;

/**
 * Roll strategy when a starting date falls on a non-business day in `dt.addBusinessDays()`.
 */
export type BusinessDayRollType = "raise" | "forward" | "backward";

/**
 * Configuration options for data type casting (`expr.cast`, `df.cast`).
 */
export interface CastOptions {
    /**
     * Whether cast errors should throw or produce `null` values.
     * @default true
     */
    strict?: boolean;
}

/**
 * Configuration options for `computeCentralMoments()`.
 */
export interface CentralMomentsOptions {
    /**
     * Whether to apply exponentially weighted bias adjustment.
     * @default true
     */
    adjust?: boolean;
    /**
     * Minimum number of valid observations required to return a non-null result.
     * @default 1
     */
    minSamples?: number;
}

/**
 * Result object returned by `computeCentralMoments()`, containing weighted central moments up to 4th order.
 */
export interface CentralMomentsResult {
    /** Number of valid numeric observations processed. */
    count: number;
    /** Weighted 2nd central moment sum ($\sum w_i (x_i - \mu)^2$). */
    m2Sum: number;
    /** Weighted 3rd central moment sum ($\sum w_i (x_i - \mu)^3$). */
    m3Sum: number;
    /** Weighted 4th central moment sum ($\sum w_i (x_i - \mu)^4$). */
    m4Sum: number;
    /** Weighted arithmetic mean, or `null` if `count < minSamples`. */
    mean: number | null;
    /** Sample or weighted standard deviation, or `null` if insufficient samples. */
    std: number | null;
    /** Sum of weights across valid observations. */
    sumW: number;
    /** Sample or weighted variance, or `null` if insufficient samples. */
    variance: number | null;
    /** Weighted sum of observation values. */
    weightedSum: number;
}

/**
 * Inclusivity mode for interval boundaries.
 */
export type ClosedBoundary = "both" | "left" | "right" | "none";

/**
 * Array-like and iterable container holding a column's sequence of values.
 */
export type ColumnData<T = any> = ArrayLike<T> & Iterable<T>;

/**
 * Dictionary mapping column names to their underlying `ColumnData` arrays.
 */
export type ColumnDict = Record<string, ColumnData>;

/**
 * 0-based numeric index or string identifier (used for column lookup and regex capture group indexing).
 */
export type ColumnIndexOrNameArg = number | string;

/**
 * Single column key or array of column keys.
 */
export type ColumnKeyArg<K = string> = K | K[];

/**
 * Target column key or column expression.
 */
export type ColumnOrExprArg<K = string> = K | IExpr;

/**
 * Selector for matching one or more DataFrame columns by name, regex pattern, or `DataType` class/instance.
 */
export type ColumnSelector<T = any> =
    | ColumnKeyArg<keyof T | RegexPatternArg>
    | ColumnKeyArg<DataType | Function>;

/**
 * Layout direction for DataFrame concatenation (`"vertical"`, `"horizontal"`, or `"diagonal"`).
 */
export type ConcatHow = "vertical" | "horizontal" | "diagonal";

/**
 * Single item accepted by `df.concat()` and `$df.concat()`: a `DataFrame` instance, array of row records, or column dictionary.
 */
export type ConcatItem = DataFrame<any> | DataFrameDataArg;

/**
 * Operand for concatenation operations (`df.concat`, `$df.concat`).
 * Accepts a single concatenable item or an array of concatenable items.
 */
export type ConcatItemsArg = ColumnKeyArg<ConcatItem>;

/**
 * Configuration options for `df.concat()` and `$df.concat()`.
 */
export interface ConcatOptions {
    /**
     * Configuration options specific to horizontal concatenation.
     */
    horizontal?: HorizontalConcatOptions;
    /**
     * Layout strategy: `"vertical"` (appends rows top-to-bottom), `"horizontal"` (joins unique columns side-by-side), or `"diagonal"` (concatenates mismatched columns with null padding).
     * @default "vertical"
     */
    how?: ConcatHow;
}

/**
 * Input data accepted by the `DataFrame` constructor and `$df.data()`.
 * Accepts an array of row record objects or a column dictionary mapping column names to arrays.
 */
export type DataFrameDataArg<T extends RowRecord = RowRecord> = T[] | ColumnDict;

/**
 * Dictionary mapping column names to their `RegisteredDataType` definitions.
 */
export type DataFrameSchema = Record<string, RegisteredDataType>;

/**
 * Decomposed calendar and wall-clock date/time components.
 */
export interface DateTimeParts {
    /** 1-indexed day of the month from 1 to 31. */
    day: number;
    /** 0-indexed day of week (0 = Sunday, 6 = Saturday). */
    dayOfWeek?: number;
    /** 0-indexed hour of day from 0 to 23 (0 = Midnight). */
    hour: number;
    /** 0-indexed minute of hour from 0 to 59. */
    minute: number;
    /** 1-indexed calendar month from 1 to 12 (1 = January, 12 = December). */
    month: number;
    /** 0-indexed millisecond from 0 to 999. */
    ms: number;
    /** 0-indexed second of minute from 0 to 59. */
    second: number;
    /** Optional target timezone identifier (e.g. "UTC", "America/New_York"). */
    timeZone?: string | null;
    /** Calendar year (e.g. 2026). */
    year: number;
}

/**
 * Sub-second time unit resolution for `Datetime` and `Duration` data types (`"ms"`, `"us"`, `"ns"`).
 */
export type DatetimeTimeUnit = "ms" | "us" | "ns";

/**
 * Configuration options for `dt.addBusinessDays()` and `addBusinessDays()`.
 */
export interface DayOffsetOptions extends IsBusinessDayOptions {
    /**
     * ISO weekday numbers (`1 = Monday` ... `7 = Sunday`) considered non-business weekend days.
     * @default [6, 7]
     */
    excludeWeekdays?: number[];
    /**
     * List or set of holiday dates (`Date`, ISO date string, or UTC timestamp) to exclude as business days.
     */
    holidays?: (Date | string | number)[] | Set<number>;
    /**
     * How to handle a starting date that falls on a non-business day: `"raise"`, `"forward"`, or `"backward"`.
     * @default "raise"
     */
    roll?: BusinessDayRollType;
}

/**
 * Duration value represented as a numeric step/millisecond count or a duration interval string (e.g. `"1d"`, `"1h"`).
 */
export type DurationValueArg = number | string;

/**
 * Configuration options for Shannon entropy (`expr.entropy`, `computeEntropy`).
 */
export interface EntropyOptions {
    /**
     * Logarithm base used to compute entropy.
     * @default Math.E
     */
    base?: number;
    /**
     * If `true`, normalizes categorical value frequencies; if `false`, treats numeric values directly as discrete probabilities.
     * @default true
     */
    normalize?: boolean;
}

/**
 * Escaping mode for `escapeRegExp()` and `str.escapeRegex()`.
 */
export type EscapeRegexMode = "tc39" | "nonAlphanumericAscii";

/**
 * Configuration options for `escapeRegExp()` and `str.escapeRegex()`.
 */
export interface EscapeRegexOptions {
    /**
     * Escaping mode: `"tc39"` (ECMAScript `RegExp.escape` specification) or `"nonAlphanumericAscii"` (escapes all `[^A-Za-z0-9]`).
     * @default "tc39"
     */
    mode?: EscapeRegexMode;
}

/**
 * Configuration options for `df.explode()`, `expr.explode()`, and `arr.explode()`.
 */
export interface ExplodeOptions {
    /**
     * When `true`, converts empty arrays to `null` rows.
     * @default true
     */
    emptyAsNull?: boolean;
    /**
     * When `true`, retains `null` array values during explosion.
     * @default true
     */
    keepNulls?: boolean;
}

/**
 * Dictionary mapping field or column names to column expressions.
 */
export type ExprDict = Record<string, IntoExpr>;

/**
 * Configuration options for `str.extractMany()` and `extractRegexMany()`.
 */
export interface ExtractManyOptions extends ExtractRegexEngineOptions {
    /**
     * Whether matching should be case-insensitive for ASCII characters.
     * @default false
     */
    asciiCaseInsensitive?: boolean;
    /**
     * Whether to return all matches (global flag).
     * @default false
     */
    global?: boolean;
    /**
     * 0-based index or name of the capture group to extract.
     * @default 0
     */
    groupIndex?: ColumnIndexOrNameArg;
    /**
     * Guarantees that the leftmost match is selected when multiple patterns match. Cannot be combined with `overlapping: true`.
     * @default false
     */
    leftmost?: boolean;
    /**
     * Whether overlapping matches across patterns are allowed.
     * @default false
     */
    overlapping?: boolean;
}

/**
 * Configuration options for regex extraction (`str.extract`, `str.extractAll`, `extractRegexEngine`).
 */
export interface ExtractRegexEngineOptions {
    /**
     * Whether matching should be case-insensitive for ASCII characters.
     * @default false
     */
    asciiCaseInsensitive?: boolean;
    /**
     * Whether to return all matches (global flag).
     * @default false
     */
    global?: boolean;
    /**
     * 0-based index or name of the capture group to extract.
     * @default 1
     */
    groupIndex?: ColumnIndexOrNameArg;
}

/**
 * Alias of `FillOptions` for `fillNull()` operations.
 */
export type FillNullOptions = FillOptions;

/**
 * Strategy for filling missing or targeted values in a column or DataFrame.
 */
export type FillNullStrategy = "forward" | "backward" | "min" | "max" | "mean" | "zero" | "one";

/**
 * Configuration options for `df.fill()`, `df.fillNull()`, `df.fillNan()`, `expr.fill()`, `expr.fillNull()`, and `expr.fillNan()`.
 */
export interface FillOptions {
    /**
     * Maximum number of consecutive target values to fill when using directional strategies (`"forward"`, `"backward"`).
     */
    limit?: number;
    /**
     * Filling strategy to calculate or propagate replacement values (`"forward"`, `"backward"`, `"min"`, `"max"`, `"mean"`, `"zero"`, `"one"`).
     */
    strategy?: FillNullStrategy;
    /**
     * Replacement scalar value or column expression to substitute in place of target values.
     */
    value?: ScalarArg;
}

/**
 * Target value selector for `df.fill()` and `expr.fill()`: `"null"`, `"nan"`, `"all"`, or a custom scalar/expression.
 */
export type FillTarget = "null" | "nan" | "all" | ScalarArg;

/**
 * Configuration options for `str.findMany()` and `findManyRegex()`.
 */
export interface FindManyOptions extends ExtractManyOptions, EscapeRegexOptions {
    /**
     * Whether matching should be case-insensitive for ASCII characters.
     * @default false
     */
    asciiCaseInsensitive?: boolean;
    /**
     * Whether to return all matches (global flag).
     * @default false
     */
    global?: boolean;
    /**
     * 0-based index or name of the capture group to locate.
     * @default 0
     */
    groupIndex?: ColumnIndexOrNameArg;
    /**
     * Guarantees that the leftmost match is selected when multiple patterns match.
     * @default false
     */
    leftmost?: boolean;
    /**
     * Treat patterns as literal substrings instead of regular expressions.
     * @default false
     */
    literal?: boolean;
    /**
     * Escaping mode when `literal` is `true`.
     * @default "tc39"
     */
    mode?: EscapeRegexMode;
    /**
     * Whether overlapping matches across patterns are allowed.
     * @default false
     */
    overlapping?: boolean;
}

/**
 * Configuration options for `str.find()` and `findRegex()`.
 */
export interface FindOptions extends ExtractRegexEngineOptions, EscapeRegexOptions {
    /**
     * Whether matching should be case-insensitive for ASCII characters.
     * @default false
     */
    asciiCaseInsensitive?: boolean;
    /**
     * Whether to return all matches (global flag).
     * @default false
     */
    global?: boolean;
    /**
     * 0-based index or name of the capture group to locate.
     * @default 0
     */
    groupIndex?: ColumnIndexOrNameArg;
    /**
     * Treat pattern as a literal substring instead of a regular expression.
     * @default false
     */
    literal?: boolean;
    /**
     * Escaping mode when `literal` is `true`.
     * @default "tc39"
     */
    mode?: EscapeRegexMode;
}

/**
 * Configuration options specific to horizontal DataFrame concatenation.
 */
export interface HorizontalConcatOptions {
    /**
     * When `true`, throws an error if row counts mismatch in horizontal concatenation. Set `false` to pad shorter DataFrames with `null`.
     * @default true
     */
    strict?: boolean;
}

/**
 * Core internal and public interface implemented by all column expressions (`ExprBase`, `ColumnExpr`).
 * @internal
 */
export interface IExpr {
    /** Aggregation reducer function registered on the expression, or `null`. */
    _aggFn?: AggFn<any> | null;
    /** Parent base expression for struct field extraction or unnesting. */
    _baseExpr?: IExpr;
    /** Left and right operand metadata for binary expressions. */
    _binaryMeta?: { _left: any; _right: any };
    /** Branch operands collected by `$df.when().then().otherwise()` chains. */
    _branchOperands?: any[];
    /** Target `RegisteredDataType` registered via `.cast()`. */
    _castType?: RegisteredDataType;
    /** Source column name or expression selector marker. */
    _colName?: string;
    /** Logs intermediate column state during expression evaluation and returns `this`. */
    _debug(label?: string): this;
    /** Evaluates the full expression pipeline against `columns`. */
    _evaluate(columns: ColumnDict, height: number): ColumnData;
    /** Evaluates post-aggregation or post-partition operations starting after `opsIndex`. */
    _evaluatePost(opsIndex: number | undefined, aggregatedArray: any[], columns: ColumnDict): ColumnData;
    /** Evaluates pre-aggregation or pre-partition operations up to `opsIndex`. */
    _evaluatePre(opsIndex: number | undefined, columns: ColumnDict, height: number): ColumnData;
    /** Evaluates a row-wise window operation over a partition slice. */
    _evaluateWindow?(groupPreValues: any[], partitionIndices: number[], currentIndex: number): any;
    /** Struct field name targeted by `.struct.field()`. */
    _fieldName?: string;
    /** Pipeline index marking the boundary of an `.agg()` reduction. */
    _groupingOpsIndex?: number;
    /** Returns `true` if the expression performs a full-column reduction without window partitioning. */
    _isGlobalAgg?(): boolean;
    /** Flag indicating whether the expression represents a constant literal value. */
    _isLiteral?: boolean;
    /** Flag indicating whether the expression expands struct fields via `.struct.unnest()`. */
    _isUnnest?: boolean;
    /** Flag indicating whether the expression requires window-function evaluation. */
    _isWindow?: boolean;
    /** Raw literal value when `_isLiteral` is `true`. */
    _literalValue?: any;
    /** Ordered pipeline of vectorized transformation functions. */
    _ops: OpFn[];
    /** Explicit output alias name assigned via `.alias()`. */
    _outputName?: string;
    /** Partitioning column keys or expressions supplied to `.over()`. */
    _partitionBy?: ColumnOrExprArg[] | null;
    /** Pipeline index marking the boundary of an `.over()` window partition. */
    _partitionOpsIndex?: number;
    /** Resolves an operand into an evaluated column array or scalar value. */
    _resolve(val: any, columns: ColumnDict, height: number): ColumnData | any;
    /** Window operation metadata descriptor when `_isWindow` is `true`. */
    _windowOp?: { type: string;[key: string]: any } | null;
}

/**
 * Value that can be converted into a column expression: a column name, `RegExp` selector, or `IExpr` instance.
 */
export type IntoExpr = RegexPatternArg | IExpr;

/**
 * Operand accepting either a single column expression selector or an array of selectors.
 */
export type IntoExprArg = ColumnKeyArg<IntoExpr>;

/**
 * Operand for multiple column expressions.
 * Accepts an array of column expressions, names, or regex selectors.
 */
export type IntoExprSeriesArg = IntoExpr[];

/**
 * Configuration options for `dt.isBusinessDay()` and `isBusinessDay()`.
 */
export interface IsBusinessDayOptions {
    /**
     * ISO weekday numbers (`1 = Monday` ... `7 = Sunday`) considered non-business weekend days.
     * @default [6, 7]
     */
    excludeWeekdays?: number[];
    /**
     * List or set of holiday dates (`Date`, ISO date string, or UTC timestamp) to exclude as business days.
     */
    holidays?: (Date | string | number)[] | Set<number>;
}

/**
 * Supported JSON serialization and parsing format.
 */
export type JSONFormat =
    /** Standard JSON format. */
    | "json"
    /** Newline Delimited JSON format. */
    | "ndjson";

/**
 * Configuration options for sample/population kurtosis (`expr.kurtosis`, `computeKurtosis`).
 */
export interface KurtosisOptions extends SkewOptions {
    /**
     * If `true`, computes biased population kurtosis; if `false`, applies sample bias correction.
     * @default true
     */
    bias?: boolean;
    /**
     * If `true`, computes Fisher's excess kurtosis (subtracts 3 so a normal distribution equals 0); if `false`, computes Pearson's kurtosis.
     * @default true
     */
    fisher?: boolean;
}

/**
 * Vectorized column operation function transforming `ColumnData` in the expression pipeline.
 */
export type OpFn = (vals: ColumnData, columns: ColumnDict) => ColumnData;

/**
 * Configuration options for `$df.readCsv()` and `parseCSV()`.
 */
export interface ReadCSVOptions {
    /**
     * Whether the CSV has a header row.
     * @default true
     */
    hasHeader?: boolean;
    /**
     * Try to infer types from values if no schema is provided.
     * @default true
     */
    inferSchema?: boolean;
    /**
     * String representations of null values.
     * @default ["", "NA", "null", "NaN"]
     */
    nullValues?: string[];
    /**
     * The character used for quoting fields.
     * @default '"'
     */
    quoteChar?: string;
    /**
     * Optional explicit schema mapping column names to their registered data types.
     */
    schema?: DataFrameSchema;
    /**
     * Character that separates fields.
     * @default ","
     */
    separator?: string;
}

/**
 * Configuration options for `$df.readJson()`.
 */
export interface ReadJSONOptions extends JSONParseOptions {
    /**
     * Whether to allow JSON primitive roots instead of requiring objects or arrays.
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
     * Optional explicit schema mapping column names to their registered data types.
     */
    schema?: DataFrameSchema;
    /**
     * Whether to trim leading and trailing whitespace before validating/parsing.
     * @default false
     */
    trimBeforeParse?: boolean;
}

/**
 * Configuration options for regex matching without capture group indexing.
 */
export interface RegexEngineOptions {
    /**
     * Whether matching should be case-insensitive for ASCII characters.
     * @default false
     */
    asciiCaseInsensitive?: boolean;
    /**
     * Whether to return all matches (global flag).
     * @default false
     */
    global?: boolean;
}

/**
 * Operand for substring matching or regular expression evaluation.
 * Accepts a substring string or a compiled `RegExp` object.
 */
export type RegexPatternArg = string | RegExp;

/**
 * Operand for multi-pattern regular expression matching.
 * Accepts an array of substring strings or compiled `RegExp` objects.
 */
export type RegexPatternSeriesArg = RegexPatternArg[];

/**
 * Dictionary mapping existing column or field names to new names.
 */
export type RenameMappingArg<T extends RowRecord = RowRecord> = Partial<Record<keyof T, string>>;

/**
 * Configuration options for `dt.replace()` and `replaceDateParts()`.
 */
export interface ReplaceDateOptions {
    /** Replacement 1-indexed day of the month (1 to 31). */
    day?: number;
    /** Replacement 0-indexed hour of day (0 to 23). */
    hour?: number;
    /** Replacement 0-indexed minute of hour (0 to 59). */
    minute?: number;
    /** Replacement 1-indexed calendar month (1 to 12). */
    month?: number;
    /** Replacement 0-indexed millisecond (0 to 999). */
    ms?: number;
    /** Replacement 0-indexed second of minute (0 to 59). */
    second?: number;
    /** Target timezone identifier used to interpret and re-project the replaced components. */
    timeZone?: string | null;
    /** Replacement calendar year. */
    year?: number;
}

/**
 * Configuration options for `str.replaceMany()` and `replaceManyString()`.
 */
export interface ReplaceManyOptions extends FindManyOptions {
    /**
     * Whether matching should be case-insensitive for ASCII characters.
     * @default false
     */
    asciiCaseInsensitive?: boolean;
    /**
     * Whether to replace all matches globally.
     * @default false
     */
    global?: boolean;
    /**
     * 0-based index or name of the capture group to replace.
     * @default 0
     */
    groupIndex?: ColumnIndexOrNameArg;
    /**
     * Guarantees that the leftmost match is selected when multiple patterns match.
     * @default false
     */
    leftmost?: boolean;
    /**
     * Treat patterns as literal substrings instead of regular expressions.
     * @default false
     */
    literal?: boolean;
    /**
     * Escaping mode when `literal` is `true`.
     * @default "tc39"
     */
    mode?: EscapeRegexMode;
    /**
     * Whether overlapping matches across patterns are allowed.
     * @default false
     */
    overlapping?: boolean;
}

/**
 * Configuration options for `str.replace()` and `replaceString()`.
 */
export interface ReplaceOptions extends RegexEngineOptions, EscapeRegexOptions {
    /**
     * Whether matching should be case-insensitive for ASCII characters.
     * @default false
     */
    asciiCaseInsensitive?: boolean;
    /**
     * Whether to replace all matches globally.
     * @default false
     */
    global?: boolean;
    /**
     * Treat pattern as a literal substring instead of a regular expression.
     * @default false
     */
    literal?: boolean;
    /**
     * Escaping mode when `literal` is `true`.
     * @default "tc39"
     */
    mode?: EscapeRegexMode;
    /**
     * Maximum number of occurrences to replace (`-1` or `Infinity` replaces all).
     * @default 1
     */
    n?: number;
}

/**
 * Dictionary representing a single row record in a DataFrame, mapping column names to values.
 */
export type RowRecord = Record<string, any>;

/**
 * Operand for scalar-level operations (`contains`, `countMatches`, `coalesce`, etc.).
 * Accepts another column expression or any valid scalar value.
 */
export type ScalarArg = IExpr | ValidScalarTypes;

/**
 * Configuration options for sample/population skewness (`expr.skew`, `computeSkew`).
 */
export interface SkewOptions {
    /**
     * If `true`, computes biased population skewness; if `false`, applies the Fisher-Pearson sample bias correction.
     * @default true
     */
    bias?: boolean;
}

/**
 * Configuration options for sorting arrays and columns (`arr.sort`, `sortArray`).
 */
export interface SortArrayOptions<T = any> {
    /**
     * Optional comparator function or dictionary mapping column names to custom comparator functions.
     */
    customComp?: ((a: any, b: any) => number) | Partial<Record<keyof T, (a: any, b: any) => number>> | null;
    /**
     * Sort order boolean or array of booleans per key.
     * @default false
     */
    descending?: ColumnKeyArg<boolean>;
    /**
     * When `true`, places nulls at the end of sorted output.
     * @default true
     */
    nullsLast?: boolean;
}

/**
 * Configuration options for `str.split()` and `splitString()`.
 */
export interface SplitOptions extends RegexEngineOptions, EscapeRegexOptions {
    /**
     * Whether matching should be case-insensitive for ASCII characters.
     * @default false
     */
    asciiCaseInsensitive?: boolean;
    /**
     * If `true`, pads missing splits with `null` to guarantee `limit + 1` elements.
     * @default false
     */
    exact?: boolean;
    /**
     * Whether to match globally.
     * @default false
     */
    global?: boolean;
    /**
     * Include matched delimiter substrings in the split output array.
     * @default false
     */
    inclusive?: boolean;
    /**
     * Maximum number of splits to perform.
     */
    limit?: number;
    /**
     * Treat delimiter as a literal substring (`true`) or regular expression (`false`).
     * @default true
     */
    literal?: boolean;
    /**
     * Escaping mode when `literal` is `true`.
     * @default "tc39"
     */
    mode?: EscapeRegexMode;
    /**
     * If `true`, throws an `InvalidArgumentError` when the split yields fewer than `limit + 1` elements.
     * @default false
     */
    strict?: boolean;
}

/**
 * Configuration options for `dt.strftime()` and `strftime()`.
 */
export interface StrftimeOptions {
    /**
     * Format string containing `%` date/time directives (e.g. `"%Y-%m-%d"`).
     */
    format: string;
    /**
     * BCP 47 locale tag used for localized month and weekday names.
     * @default "en-US"
     */
    locale?: string;
    /**
     * Target IANA timezone identifier used when formatting date/time parts.
     * @default "UTC"
     */
    timeZone?: string;
}

/**
 * Binary-to-text encoding scheme (`"hex"` or `"base64"`).
 */
export type StringEncoding = "hex" | "base64";

/**
 * Configuration options for `str.strptime()` and `strptime()`.
 */
export interface StrptimeOptions {
    /**
     * Default IANA timezone or UTC offset applied when the parsed string has no `%z`/`%Z` directive.
     * @default "UTC"
     */
    defaultTimeZone?: string;
    /**
     * Format string containing `%` date/time directives (e.g. `"%Y-%m-%d %H:%M:%S"`).
     */
    format: string;
    /**
     * If `true`, throws an error when a string fails to match `format`; if `false`, returns `null`.
     * @default true
     */
    strict?: boolean;
}

/**
 * Operand for struct field updates and additions (`struct.withFields`, `$df.struct`).
 * Accepts an array of named expressions or an object dictionary mapping field names to expressions.
 */
export type StructFieldsArg = IntoExprSeriesArg | ExprDict;

/**
 * Time unit resolution for epoch conversions (`"s"`, `"ms"`, `"us"`, `"ns"`).
 */
export type TimeUnit = "s" | "ms" | "us" | "ns";

/**
 * Output unit or string format for UTC timezone offset calculations.
 */
export type UtcOffsetFormat = "milliseconds" | "minutes" | "hours" | "iso" | "basic";

/**
 * Configuration options for `dt.utcOffset()` and `getUtcOffset()`.
 */
export interface UtcOffsetOptions {
    /**
     * Output format: `"milliseconds"`, `"minutes"`, `"hours"`, `"iso"` (`"+HH:MM"`), or `"basic"` (`"+HHMM"`).
     * @default "milliseconds"
     */
    format?: UtcOffsetFormat;
    /**
     * Which offset component to compute: `"base"` (standard offset), `"total"` (wall-clock offset), or `"daylightSavingTime"` (DST delta).
     * @default "total"
     */
    type?: UtcOffsetType;
}

/**
 * Component of the UTC timezone offset to compute (`"base"`, `"total"`, or `"daylightSavingTime"`).
 */
export type UtcOffsetType = "base" | "total" | "daylightSavingTime";

/**
 * Union of JavaScript primitive value types.
 */
export type ValidPrimitiveTypes = string | number | boolean | bigint | symbol | null | undefined;

/**
 * Union of valid scalar cell values supported in DataFrame columns and expressions.
 */
export type ValidScalarTypes = Exclude<ValidPrimitiveTypes, symbol> | Date | AnyTypedArray;
