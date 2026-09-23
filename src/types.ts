/** @typefile */
import type { DataFrame } from "./dataframe/dataframe";
import type { RegisteredDataType } from "./datatypes";

export type { RegisteredDataType };

export type RowRecord = Record<string, any>;
export type JSONFormat =
    /** Standard JSON format. */
    | "json"
    /** Newline Delimited JSON format. */
    | "ndjson";

export type ColumnData<T = any> = ArrayLike<T> & Iterable<T>;
export type ColumnDict = Record<string, ColumnData>;
export type DataFrameSchema = Record<string, RegisteredDataType>;

export type DataFrameColumns<T extends RowRecord> = {
    [K in keyof T]: ColumnData<T[K]>;
};

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

export type ValidPrimitiveTypes = string | number | boolean | bigint | symbol | null | undefined;
export type ValidScalarTypes = Exclude<ValidPrimitiveTypes, symbol> | Date | AnyTypedArray;

export type AggFn<V, R = any> = (values: V[]) => R;
export type OpFn = (vals: ColumnData, columns: ColumnDict) => ColumnData;

export interface CastOptions {
    /**
     * Whether cast errors should throw or produce null values.
     * @default true
     */
    strict?: boolean;
}

export type IntoExpr = string | RegExp | IExpr;

export interface IExpr {
    _ops: OpFn[];
    _colName?: string;
    _outputName?: string;
    _isLiteral?: boolean;
    _literalValue?: any;
    _aggFn?: AggFn<any> | null;
    _castType?: RegisteredDataType;
    _binaryMeta?: { _left: any; _right: any };
    _groupingOpsIndex?: number;
    _partitionOpsIndex?: number;
    _partitionBy?: (string | IExpr)[] | null;
    _windowOp?: { type: string;[key: string]: any } | null;
    _isWindow?: boolean;
    _baseExpr?: IExpr;
    _fieldName?: string;
    _isUnnest?: boolean;
    _branchOperands?: any[];
    _isGlobalAgg?(): boolean;
    alias(name: string): this;
    cast(dataType: RegisteredDataType, options?: CastOptions): this;
    _resolve(val: any, columns: ColumnDict, height: number): ColumnData | any;
    evaluate(columns: ColumnDict, height: number): ColumnData;
    _evaluatePre(opsIndex: number | undefined, columns: ColumnDict, height: number): ColumnData;
    _evaluatePost(opsIndex: number | undefined, aggregatedArray: any[], columns: ColumnDict): ColumnData;
    _evaluateWindow?(groupPreValues: any[], partitionIndices: number[], currentIndex: number): any;
    debug(label?: string): this;
}

export type TimeUnit = "s" | "ms" | "us" | "ns";
export type DatetimeTimeUnit = "ms" | "us" | "ns";
export type DurationUnit = "ns" | "us" | "ms" | "s" | "m" | "h" | "d" | "w" | "mo" | "q" | "y" | "i";


export interface DurationInterval {
    months: number;
    days: number;
    ms: number;
    indexUnits: number;
    isCalendar: boolean;
    isIndex: boolean;
}

export interface DurationOptions {
    weeks?: IntoExpr | number;
    days?: IntoExpr | number;
    hours?: IntoExpr | number;
    minutes?: IntoExpr | number;
    seconds?: IntoExpr | number;
    milliseconds?: IntoExpr | number;
    microseconds?: IntoExpr | number;
    nanoseconds?: IntoExpr | number;
}

export interface ParseDurationStringOptions {
    to?: DurationUnit;
}

export interface ToDurationOptions extends ParseDurationStringOptions {
    fallback?: number;
}

export interface StrptimeOptions {
    format: string;
    strict?: boolean;
    defaultTimeZone?: string;
}

export interface StrftimeOptions {
    format: string;
    locale?: string;
    timeZone?: string;
}

export type StringEncoding = "hex" | "base64";

export interface StringEncodeOptions {
    encoding: StringEncoding;
}

export interface StringDecodeOptions extends StringEncodeOptions {
    strict?: boolean;
}

export type EscapeRegexMode = "tc39" | "nonAlphanumericAscii";

export interface EscapeRegexOptions {
    /**
     * Escaping mode:
     * - "tc39" (default): TC39 ECMAScript standard specification (syntax metacharacters + set operators).
     * - "nonAlphanumericAscii": Escapes all non-alphanumeric ASCII characters ([^A-Za-z0-9]) matching Polars / Rust regex::escape.
     */
    mode?: EscapeRegexMode;
}


export interface ExtractRegexEngineOptions {
    /**
     * Index or name of the capture group to extract.
     */
    groupIndex?: number | string;
    /**
     * Whether matching should be case-insensitive for ASCII characters.
     */
    asciiCaseInsensitive?: boolean;
    /**
     * Whether to return all matches (global flag). Defaults to false.
     */
    global?: boolean;
}

export type RegexEngineOptions = Omit<ExtractRegexEngineOptions, "groupIndex">;

export interface ExtractManyOptions extends ExtractRegexEngineOptions {
    /**
     * Whether overlapping matches are allowed.
     */
    overlapping?: boolean;
    /**
     * Guarantees in case there are overlapping matches that the leftmost match is used.
     * In case there are multiple candidates for the leftmost match, the pattern which comes
     * first in patterns is used. May not be used together with overlapping = true.
     */
    leftmost?: boolean;
}

export interface FindOptions extends ExtractRegexEngineOptions, EscapeRegexOptions {
    /**
     * Treat pattern as literal string instead of regex.
     */
    literal?: boolean;
}

export interface FindManyOptions extends ExtractManyOptions, EscapeRegexOptions {
    /**
     * Treat patterns as literal strings instead of regex.
     */
    literal?: boolean;
}

export interface ReplaceOptions extends RegexEngineOptions, EscapeRegexOptions {
    /**
     * Treat pattern as a literal string instead of regex.
     */
    literal?: boolean;
    /**
     * Number of occurrences to replace. Use -1 or Infinity to replace all. Defaults to 1.
     */
    n?: number;
}

export interface ReplaceManyOptions extends FindManyOptions { }

export interface SplitOptions extends RegexEngineOptions, EscapeRegexOptions {
    /**
     * Treat delimiter as literal string (default: true). Set to false for regex matching.
     */
    literal?: boolean;
    /**
     * Include delimiter in the split results.
     */
    inclusive?: boolean;
    /**
     * Maximum number of splits to perform.
     */
    limit?: number;
    /**
     * If true, pads missing splits with null to guarantee exact limit + 1 parts.
     */
    exact?: boolean;
    /**
     * If true, throws an InvalidArgumentError if the split does not yield at least limit + 1 parts.
     */
    strict?: boolean;
}

export type BusinessDayRollType = "raise" | "forward" | "backward";

export interface IsBusinessDayOptions {
    holidays?: (Date | string | number)[] | Set<number>;
    excludeWeekdays?: number[];
}

export interface DayOffsetOptions extends IsBusinessDayOptions {
    roll?: BusinessDayRollType;
}

export type UtcOffsetType = "base" | "total" | "daylightSavingTime";
export type UtcOffsetFormat = "milliseconds" | "minutes" | "hours" | "iso" | "basic";

export interface UtcOffsetOptions {
    type?: UtcOffsetType;
    format?: UtcOffsetFormat;
}

export interface DateTimeParts {
    /** Calendar year (e.g. 2026). */
    year: number;
    /** 1-indexed calendar month from 1 to 12 (1 = January, 12 = December). */
    month: number;
    /** 1-indexed day of the month from 1 to 31. */
    day: number;
    /** 0-indexed hour of day from 0 to 23 (0 = Midnight). */
    hour: number;
    /** 0-indexed minute of hour from 0 to 59. */
    minute: number;
    /** 0-indexed second of minute from 0 to 59. */
    second: number;
    /** 0-indexed millisecond from 0 to 999. */
    ms: number;
    /** 0-indexed day of week (0 = Sunday, 6 = Saturday). */
    dayOfWeek?: number;
    /** Optional target timezone identifier (e.g. "UTC", "America/New_York"). */
    timeZone?: string | null;
}

export type ReplaceDateOptions = Partial<Omit<DateTimeParts, "dayOfWeek">>;

/** Rolling Window Configuration */
export interface RollingOptions {
    windowSize: number;
}

/** Exponentially Weighted Moving Reduction Operation */
export type EwmOperation = "mean" | "sum" | "std" | "var" | "skew" | "kurt";

/** Exponentially Weighted Moving Window Configuration */
export interface EwmOptions {
    alpha?: number;
    span?: number;
    halfLife?: number | string;
    com?: number;
    minSamples?: number;
    adjust?: boolean;
    ignoreNulls?: boolean;
    by?: string | IExpr;
    bias?: boolean;
    fisher?: boolean;
}

export type EwmSumOptions = Omit<EwmOptions, "adjust" | "bias" | "fisher">;
export type EwmMeanOptions = Omit<EwmOptions, "bias" | "fisher">;
export type EwmVarOptions = Omit<EwmOptions, "bias" | "fisher">;
export type EwmStdOptions = Omit<EwmOptions, "bias" | "fisher">;
export type EwmSkewOptions = Omit<EwmOptions, "fisher">;
export type EwmKurtOptions = EwmOptions;

/** Sorting Configuration */
export interface SortArrayOptions<T = any> {
    descending?: boolean | boolean[];
    nullsLast?: boolean;
    customComp?: ((a: any, b: any) => number) | Partial<Record<keyof T, (a: any, b: any) => number>> | null;
}

export interface SortOptions<T = any> extends SortArrayOptions<T> {
    by: keyof T | (keyof T)[] | IExpr | IExpr[];
}

/** Concatenation Configuration */
export type ConcatHow = "vertical" | "horizontal" | "diagonal";
export interface HorizontalConcatOptions {
    strict?: boolean;
}
export interface ConcatOptions {
    how?: ConcatHow;
    horizontal?: HorizontalConcatOptions;
}
export type ConcatItem = DataFrame<any> | ColumnDict | RowRecord[];

export interface ExplodeOptions {
    emptyAsNull?: boolean;
    keepNulls?: boolean;
}


import type { DataType } from "./datatypes/DataType";

export type InferDataType<T> = T extends DataType<infer U> ? U : any;

export type InferSchema<S extends DataFrameSchema> = {
    [K in keyof S]: InferDataType<S[K]>;
};

export type FlattenUnion<T> = {
    [K in (T extends any ? keyof T : never)]?: T extends any ? (K extends keyof T ? T[K] : never) : never;
};

export type FillNullStrategy = "forward" | "backward" | "min" | "max" | "mean" | "zero" | "one";

export type FillTarget = "null" | "nan" | "all" | IExpr | ValidScalarTypes;

export interface FillOptions {
    value?: any;
    strategy?: FillNullStrategy;
    limit?: number;
}

export interface FillNullOptions {
    value?: any;
    strategy?: FillNullStrategy;
    limit?: number;
}

export interface ToStructOptions {
    fields?: string[] | ((idx: number) => string);
    upperBound?: number;
}

export interface SkewOptions {
    bias?: boolean;
}

export interface KurtosisOptions {
    fisher?: boolean;
    bias?: boolean;
}

export interface CentralMomentsOptions {
    adjust?: boolean;
    minSamples?: number;
}

export interface CentralMomentsResult {
    count: number;
    sumW: number;
    weightedSum: number;
    mean: number | null;
    m2Sum: number;
    m3Sum: number;
    m4Sum: number;
    variance: number | null;
    std: number | null;
}

export interface EntropyOptions {
    base?: number;
    normalize?: boolean;
}

export interface ShiftOptions {
    /**
     * Fallback fill value for empty slots introduced by shift/lag/lead.
     * @default null
     */
    fillValue?: any;
}

export interface ToValidArrayOptions {
    /**
     * If true, returns a shallow copy of an existing array.
     * If false, returns the input array directly without cloning.
     * @default true
     */
    clone?: boolean;
    /**
     * If true, wraps null or undefined into an array containing that single element.
     * If false, returns an empty array [].
     * @default false
     */
    wrapNull?: boolean;
}