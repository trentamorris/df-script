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

export type IntoExpr = string | IExpr;

export interface IExpr {
    _ops: OpFn[];
    _colName?: string;
    _outputName?: string;
    _isLiteral?: boolean;
    _literalValue?: any;
    _aggFn?: AggFn<any> | null;
    _groupingOpsIndex?: number;
    _partitionOpsIndex?: number;
    _partitionBy?: (string | IExpr)[] | null;
    _windowOp?: { type: string;[key: string]: any } | null;
    _isWindow?: boolean;
    alias(name: string): this;
    cast(dataType: RegisteredDataType): this;
    _resolve(val: any, columns: ColumnDict, height: number): ColumnData | any;
    evaluate(columns: ColumnDict, height: number): ColumnData;
    _evaluatePre(opsIndex: number | undefined, columns: ColumnDict, height: number): ColumnData;
    _evaluatePost(opsIndex: number | undefined, aggregatedArray: any[], columns: ColumnDict): ColumnData;
    _evaluateWindow?(groupPreValues: any[], partitionIndices: number[], currentIndex: number): any;
    debug(label?: string): this;
}

export type TimeUnit = "s" | "ms" | "us" | "ns";

export type DateDiffUnit =
    | "ms" | "milliseconds"
    | "s" | "seconds"
    | "m" | "minutes"
    | "h" | "hours"
    | "d" | "days"
    | "w" | "weeks"
    | "mo" | "months"
    | "q" | "quarters"
    | "y" | "years";

export interface DateDiffOptions {
    roundMode?: "exact" | "floor" | "ceil" | "round" | "trunc";
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

export type BusinessDayRollType = "raise" | "forward" | "backward";

export interface IsBusinessDayOptions {
    holidays?: (Date | string | number)[] | Set<number>;
    excludeWeekdays?: number[];
}

export interface BusinessDayOffsetOptions extends IsBusinessDayOptions {
    roll?: BusinessDayRollType;
}

export type UtcOffsetType = "base" | "total" | "daylightSavingTime";
export type UtcOffsetFormat = "milliseconds" | "minutes" | "hours" | "iso" | "basic";

export interface UtcOffsetOptions {
    type?: UtcOffsetType;
    format?: UtcOffsetFormat;
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

export type { UniqueArrayStatsOptions, JoinArrayOptions } from "./utils/array";

export interface ExplodeOptions {
    empty_as_null?: boolean;
    keep_nulls?: boolean;
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

export interface FillNullOptions {
    value?: any;
    strategy?: FillNullStrategy;
    limit?: number;
}

export interface ToStructOptions {
    fields?: string[] | ((idx: number) => string);
    upper_bound?: number;
}

