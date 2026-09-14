import type { AggFn, RowRecord, DataFrameSchema, JSONFormat, SortArrayOptions, SortOptions } from "../types";
import type { JSONParseOptions, SafeJsonReplacerOptions, NDJSONParseOptions } from "../utils";
import type { DataFrame } from "./dataframe";
import type { ColumnExpr } from "../columnExpressions";

export type { JSONParseOptions, SafeJsonReplacerOptions, NDJSONParseOptions, SortArrayOptions, SortOptions };

export type GroupedAggDelegatedMethodNames =
    | "all"
    | "avg"
    | "count"
    | "first"
    | "kurtosis"
    | "last"
    | "max"
    | "mean"
    | "median"
    | "min"
    | "nUnique"
    | "skew"
    | "std"
    | "sum"
    | "variance";

export type GroupedAggDelegatedOps<T extends RowRecord = any> = {
    [K in GroupedAggDelegatedMethodNames]: (...args: Parameters<ColumnExpr<any>[K]>) => DataFrame<T>;
};

export type JoinType = "inner" | "outer" | "left" | "right" | "semi" | "anti" | "cross";
export type JoinMaintainOrder = "none" | "left" | "right" | "left_right" | "right_left";
export type LimitPosition = "start" | "end";
export type GroupMap = Map<string, number[]>;


export interface EqualsOptions {
    nullsEqual?: boolean;
}

export interface LimitOptions {
    offset?: number;
    from?: LimitPosition;
}

export interface PivotOptions<T> {
    index: (keyof T) | (keyof T)[];
    columns: keyof T;
    values: keyof T;
    agg?: AggFn<any> | string;
}

export interface JoinOptions<T = any, U extends RowRecord = any> {
    on?: (keyof T & keyof U) | (keyof T & keyof U)[];
    leftOn?: (keyof T) | (keyof T)[];
    rightOn?: (keyof U) | (keyof U)[];
    how?: JoinType;
    suffixes?: [string, string];
    joinNulls?: boolean;
    coalesce?: boolean;
    maintainOrder?: JoinMaintainOrder | boolean;
}

export type JoinAsofStrategy = "backward" | "forward" | "nearest";

export interface JoinAsofOptions<T = any, U extends RowRecord = any> {
    on?: (keyof T & keyof U);
    leftOn?: (keyof T);
    rightOn?: (keyof U);
    by?: (keyof T & keyof U) | (keyof T & keyof U)[];
    leftBy?: (keyof T) | (keyof T)[];
    rightBy?: (keyof U) | (keyof U)[];
    strategy?: JoinAsofStrategy;
    tolerance?: number | string;
    allowExactMatches?: boolean;
    suffixes?: [string, string];
    coalesce?: boolean;
    checkSorted?: boolean;
}

export type JoinWhereStrategy = "inner" | "left" | "right";

export interface JoinWhereOptions {
    /** Join strategy: "inner", "left", or "right". Default "inner". */
    how?: JoinWhereStrategy;
    /** Column name suffixes [leftSuffix, rightSuffix] to resolve duplicate column names. Default ["", "_right"]. */
    suffixes?: [string, string];
}

export type DynamicClosed = "left" | "right" | "both" | "none";
export type DynamicLabel = "left" | "right" | "datapoint";
export type DynamicStartBy = "window" | "datapoint" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface GroupByDynamicOptions<T = any> {
    /** Time interval window period (e.g. "1d", "1h", 1000). Defaults to every if not specified. */
    every: string | number;
    /** Time period duration window width. Defaults to every if omitted. */
    period?: string | number;
    /** Offset window start by a duration. Defaults to 0. */
    offset?: string | number;
    /** Truncate the index column values to the window start. Default: true */
    truncate?: boolean;
    /** Include the lower and upper window boundaries (_lower_boundary, _upper_boundary). Default: false */
    includeBoundaries?: boolean;
    /** Which boundary of the window interval is closed ("left", "right", "both", "none"). Default: "left" */
    closed?: DynamicClosed;
    /** Which window boundary to use as the timestamp label ("left", "right", "data_point"). Default: "left" */
    label?: DynamicLabel;
    /** Additional columns to partition / group by before dynamic windowing */
    by?: (keyof T) | (keyof T)[];
    /** Polars alias for by */
    groupBy?: (keyof T) | (keyof T)[];
    /** Strategy to determine window start ("window", "datapoint", or day of week). Default: "window" */
    startBy?: DynamicStartBy;
    /** Verify whether index column is sorted in ascending order. Default: true */
    checkSorted?: boolean;
}

export interface PartitionByOptions {
    /**
     * If true, returns a Record/dictionary mapping each partition key string to its DataFrame.
     * If false (default), returns an array of DataFrames.
     * @default false
     */
    asDict?: boolean;
    /**
     * If true (default), maintain original encounter order of partitions.
     * @default true
     */
    maintainOrder?: boolean;
}

export interface UnpivotOptions<T> {
    idVars: (keyof T) | (keyof T)[];
    valueVars: (keyof T) | (keyof T)[];
    varName?: string;
    valueName?: string;
}

export interface TransposeOptions {
    includeHeader?: boolean;
    headerName?: string;
    columnNames?: string | Iterable<string>;
}

export interface UnstackOptions {
    /**
     * Number of columns to reshape each input column into.
     */
    step: number;

    /**
     * Reshaping direction:
     * - "vertical" (default): fills down the new columns first before moving to the next column.
     * - "horizontal": fills across row-by-row before moving to the next row.
     * @default "vertical"
     */
    how?: "vertical" | "horizontal";

    /**
     * Value to fill in empty cells when length is not evenly divisible by step.
     * @default null
     */
    fillValues?: any;
}


export interface ReadJSONOptions extends JSONParseOptions {
    /**
     * Optional explicit schema mapping column names to their registered data types.
     */
    schema?: DataFrameSchema;
}

/**
 * The `replacer` argument type extracted directly from the overloads of the built-in `JSON.stringify`.
 * Hover or Go-to-Definition on `JSON.stringify` below to inspect the standard library signatures.
 */
export type JSONStringifyReplacer = typeof JSON.stringify extends {
    (value: any, replacer?: infer R1, space?: any): string;
    (value: any, replacer?: infer R2, space?: any): string;
} ? R1 | R2 : never;

export interface WriteJSONOptions {
    /**
     * The format of the JSON output.
     * @default "json"
     */
    format?: JSONFormat;

    /**
     * Options for the safe JSON replacer.
     */
    replacerOptions?: SafeJsonReplacerOptions;
}

export type { WriteCSVOptions } from "../utils";

export interface ReadCSVOptions {
    /**
     * Whether the CSV has a header row.
     * @default true
     */
    hasHeader?: boolean;

    /**
     * Character that separates fields.
     * @default ","
     */
    separator?: string;

    /**
     * The character used for quoting fields.
     * @default '"'
     */
    quoteChar?: string;

    /**
     * String representations of null values.
     * @default ["", "NA", "null", "NaN"]
     */
    nullValues?: string[];

    /**
     * Optional explicit schema mapping column names to their registered data types.
     */
    schema?: DataFrameSchema;

    /**
     * Try to infer types from values if no schema is provided.
     * @default true
     */
    inferSchema?: boolean;
}
