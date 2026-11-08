/**
 * @typefile
 */
import type {
    AggFn,
    ClosedBoundary,
    ColumnData,
    ColumnKeyArg,
    ColumnOrExprArg,
    DataFrameSchema,
    DurationValueArg,
    IExpr,
    IntoExpr,
    IntoExprArg,
    JSONFormat,
    RowRecord,
    SortArrayOptions
} from "../types";
import type { RegisteredDataType } from "../datatypes";
import type { SafeJsonReplacerOptions } from "../utils";
import type { DataFrame } from "./dataframe";
import type { ColumnExpr } from "../columnExpressions";

/**
 * Target data type specification for `DataFrame.cast()`.
 * Accepts a single `RegisteredDataType` to cast all columns, or a schema dictionary mapping column names to data types.
 */
export type CastTargetArg = RegisteredDataType | DataFrameSchema;

/**
 * Mapped column dictionary storing a `ColumnData` sequence for each key in row record `T`.
 */
export type DataFrameColumns<T extends RowRecord> = {
    /**
     * Column data array or typed array for column `K`.
     */
    [K in keyof T]: ColumnData<T[K]>;
};

/**
 * Tuple representing DataFrame dimensions as `[height, width]`.
 */
export type DataFrameShape = [number, number];

/**
 * Target index column or expression for `DataFrame.groupByDynamic()`.
 */
export type DynamicIndexColumnArg<K extends string = string> = K | IntoExpr;

/**
 * Window boundary used to label each dynamic group window in `DataFrame.groupByDynamic()`.
 */
export type DynamicLabel = "left" | "right" | "datapoint";

/**
 * Strategy for determining the initial window boundary alignment in `DataFrame.groupByDynamic()`.
 */
export type DynamicStartBy = "window" | "datapoint" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

/**
 * Configuration options for checking equality between two DataFrames (`DataFrame.equals()`).
 */
export interface EqualsOptions {
    /**
     * Whether nulls and NaNs compare as equal.
     * @default true
     */
    nullsEqual?: boolean;
}

/**
 * Single filter condition: a boolean column expression or a row-level predicate function.
 */
export type FilterPredicate<T extends RowRecord = RowRecord> = IExpr | RowPredicateFn<T>;

/**
 * Operand for `DataFrame.filter()`.
 * Accepts a single filter predicate or an array of filter predicates.
 */
export type FilterPredicateArg<T extends RowRecord = RowRecord> = ColumnKeyArg<FilterPredicate<T>>;

/**
 * Configuration options for rolling/dynamic temporal or index window grouping (`DataFrame.groupByDynamic()`).
 */
export interface GroupByDynamicOptions<T = any> {
    /**
     * Additional columns to partition / group by before dynamic windowing.
     */
    by?: ColumnKeyArg<keyof T>;
    /**
     * Verify whether index column is sorted in ascending order.
     * @default true
     */
    checkSorted?: boolean;
    /**
     * Which boundary of the window interval is closed (`"left"`, `"right"`, `"both"`, `"none"`).
     * @default "left"
     */
    closed?: ClosedBoundary;
    /**
     * Time interval window step period (e.g. `"1d"`, `"1h"`, `1000`).
     */
    every: DurationValueArg;
    /**
     * Polars alias for `by`.
     */
    groupBy?: ColumnKeyArg<keyof T>;
    /**
     * Include the lower and upper window boundaries (`_lower_boundary`, `_upper_boundary`).
     * @default false
     */
    includeBoundaries?: boolean;
    /**
     * Which window boundary to use as the timestamp label (`"left"`, `"right"`, `"datapoint"`).
     * @default "left"
     */
    label?: DynamicLabel;
    /**
     * Offset window start by a duration.
     * @default 0
     */
    offset?: DurationValueArg;
    /**
     * Time period duration window width. Defaults to `every` if omitted.
     */
    period?: DurationValueArg;
    /**
     * Strategy to determine window start (`"window"`, `"datapoint"`, or day of week).
     * @default "window"
     */
    startBy?: DynamicStartBy;
    /**
     * Truncate the index column values to the window start.
     * @default true
     */
    truncate?: boolean;
}

/**
 * Method names of `ColumnExpr` aggregation operations automatically delegated onto `GroupedData`.
 */
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

/**
 * Mapped interface of aggregation shorthand methods available directly on `GroupedData`.
 */
export type GroupedAggDelegatedOps<T extends RowRecord = any> = {
    /**
     * Executes aggregation `K` across all non-key columns in each group.
     */
    [K in GroupedAggDelegatedMethodNames]: (...args: Parameters<ColumnExpr<any>[K]>) => DataFrame<T>;
};

/**
 * Internal hash map associating serialized group key strings with arrays of matching 0-based row indices.
 */
export type GroupMap = Map<string, number[]>;

/**
 * Value operand for `DataFrame.insertColumn()`.
 * Accepts a column expression selector or a raw array-like sequence of column values.
 */
export type InsertColumnArg = IntoExpr | ArrayLike<any>;

/**
 * Single row yielded by `DataFrame.iterRows()`, either as a positional value array or a named row record.
 */
export type IterRowResult<T extends RowRecord = RowRecord> = any[] | T;

/**
 * Configuration options for `DataFrame.iterRows()`.
 */
export interface IterRowsOptions {
    /**
     * When `true`, yields row objects with column keys (`{ col: val }`).
     * When `false` (default), yields positional arrays (`[val1, val2]`).
     * @default false
     */
    named?: boolean;
}

/**
 * Configuration options for as-of proximity joins (`DataFrame.joinAsof()`).
 */
export interface JoinAsofOptions<T = any, U extends RowRecord = any> {
    /**
     * Whether exact key matches are permitted.
     * @default true
     */
    allowExactMatches?: boolean;
    /**
     * Optional exact-match group column(s) present in both DataFrames.
     */
    by?: ColumnKeyArg<keyof T & keyof U>;
    /**
     * Whether to verify that join keys are sorted ascending prior to matching.
     * @default true
     */
    checkSorted?: boolean;
    /**
     * Coalescing behavior for join key columns.
     * @default true
     */
    coalesce?: boolean;
    /**
     * Group column(s) for exact key matching in left DataFrame.
     */
    leftBy?: ColumnKeyArg<keyof T>;
    /**
     * Left DataFrame join key column name.
     */
    leftOn?: (keyof T);
    /**
     * Column name to join on (must exist in both DataFrames and be sorted ascending).
     */
    on?: (keyof T & keyof U);
    /**
     * Group column(s) for exact key matching in right DataFrame.
     */
    rightBy?: ColumnKeyArg<keyof U>;
    /**
     * Right DataFrame join key column name.
     */
    rightOn?: (keyof U);
    /**
     * Match search strategy (`"backward"`, `"forward"`, or `"nearest"`).
     * @default "backward"
     */
    strategy?: JoinAsofStrategy;
    /**
     * Column name suffixes `[leftSuffix, rightSuffix]` to resolve name collisions.
     * @default ["", "_right"]
     */
    suffixes?: JoinSuffixes;
    /**
     * Maximum allowed distance between left key and right key.
     */
    tolerance?: DurationValueArg;
}

/**
 * Search direction strategy for `DataFrame.joinAsof()`.
 */
export type JoinAsofStrategy = "backward" | "forward" | "nearest";

/**
 * Row order preservation mode for `DataFrame.join()`.
 */
export type JoinMaintainOrder = "none" | "left" | "right" | "left_right" | "right_left";

/**
 * Configuration options for joining two DataFrames (`DataFrame.join()`).
 */
export interface JoinOptions<T = any, U extends RowRecord = any> {
    /**
     * Coalescing behavior for join key columns. If `true`, coalesces join key values into left key columns and drops right key columns.
     * @default true
     */
    coalesce?: boolean;
    /**
     * Join strategy (`"inner"`, `"left"`, `"right"`, `"outer"`, `"semi"`, `"anti"`, or `"cross"`).
     * @default "inner"
     */
    how?: JoinType;
    /**
     * If `true`, null key values are treated as equal and match each other across DataFrames.
     * @default false
     */
    joinNulls?: boolean;
    /**
     * Join key column(s) in the left DataFrame when key names differ.
     */
    leftOn?: ColumnKeyArg<keyof T>;
    /**
     * Row order preservation strategy (`"none"`, `"left"`, `"right"`, `"left_right"`, `"right_left"`, or boolean).
     * @default "none"
     */
    maintainOrder?: JoinMaintainOrder | boolean;
    /**
     * Join key column name or array of key column names that exist in both DataFrames.
     */
    on?: ColumnKeyArg<keyof T & keyof U>;
    /**
     * Join key column(s) in the right DataFrame when key names differ.
     */
    rightOn?: ColumnKeyArg<keyof U>;
    /**
     * Suffix tuple `[leftSuffix, rightSuffix]` appended to overlapping non-key column names. Ignored for `"semi"` and `"anti"` joins.
     * @default ["", "_right"]
     */
    suffixes?: JoinSuffixes;
}

/**
 * Tuple of `[leftSuffix, rightSuffix]` appended to colliding non-key column names during joins.
 */
export type JoinSuffixes = [string, string];

/**
 * Relational join strategy for `DataFrame.join()`.
 */
export type JoinType = "inner" | "outer" | "left" | "right" | "semi" | "anti" | "cross";

/**
 * Variadic argument accepted by `DataFrame.joinWhere()`.
 * Accepts a predicate expression, an array of predicate expressions, or a `JoinWhereOptions` configuration object.
 */
export type JoinWhereArg = IntoExprArg | JoinWhereOptions;

/**
 * Configuration options for conditional inequality/predicate joins (`DataFrame.joinWhere()`).
 */
export interface JoinWhereOptions {
    /**
     * Join strategy: `"inner"`, `"left"`, or `"right"`.
     * @default "inner"
     */
    how?: JoinWhereStrategy;
    /**
     * Column name suffixes `[leftSuffix, rightSuffix]` to resolve duplicate column names.
     * @default ["", "_right"]
     */
    suffixes?: JoinSuffixes;
}

/**
 * Join strategy for predicate-based conditional joins (`DataFrame.joinWhere()`).
 */
export type JoinWhereStrategy = "inner" | "left" | "right";

/**
 * Configuration options for slicing rows from a DataFrame (`DataFrame.limit()`).
 */
export interface LimitOptions {
    /**
     * Slice direction starting point (`"start"` or `"end"`).
     * @default "start"
     */
    from?: LimitPosition;
    /**
     * Number of rows to skip before taking `n` rows.
     * @default 0
     */
    offset?: number;
}

/**
 * Slice direction starting point for `DataFrame.limit()`.
 */
export type LimitPosition = "start" | "end";

/**
 * Column name or expression key for `DataFrame.partitionBy()`.
 */
export type PartitionByKey<T extends RowRecord = RowRecord> = ColumnOrExprArg<keyof T & string>;

/**
 * Configuration options for splitting a DataFrame into partitions (`DataFrame.partitionBy()`).
 */
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

/**
 * Return value of `DataFrame.partitionBy()`, either an array of partitioned DataFrames or a dictionary keyed by partition string.
 */
export type PartitionByResult<T extends RowRecord = RowRecord> = DataFrame<T>[] | Record<string, DataFrame<T>>;

/**
 * Configuration options for reshaping a DataFrame from long to wide format (`DataFrame.pivot()`).
 */
export interface PivotOptions<T> {
    /**
     * Aggregation function to apply when multiple values exist for a cell.
     */
    agg?: AggFn<any> | string;
    /**
     * Column whose distinct values become new wide column headers.
     */
    columns: keyof T;
    /**
     * Key column(s) to use as new DataFrame rows.
     */
    index: ColumnKeyArg<keyof T>;
    /**
     * Column whose cell values populate the pivoted grid cells.
     */
    values: keyof T;
}

/**
 * Row-level predicate callback function for `DataFrame.filter()`.
 */
export type RowPredicateFn<T extends RowRecord = RowRecord> = (row: T) => any;

/**
 * Variadic argument for `DataFrame.select()`, `DataFrame.withColumns()`, and `GroupedData.agg()`.
 * Accepts a single selection item or an array of selection items.
 */
export type SelectArg = ColumnKeyArg<SelectItem>;

/**
 * Single column selection or expression item for `select()` and `withColumns()`.
 * Accepts a column name, column expression, or dictionary mapping output column names to expressions/literals.
 */
export type SelectItem = ColumnOrExprArg | RowRecord;

/**
 * Configuration options for sorting a DataFrame (`DataFrame.sort()`).
 */
export interface SortOptions<T = any> extends SortArrayOptions<T> {
    /**
     * Column name(s) or expression(s) to sort by.
     */
    by: ColumnKeyArg<keyof T> | ColumnKeyArg<IExpr>;
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
 * Column header source for `DataFrame.transpose()`.
 * Accepts the name of an existing column whose values become headers, or an iterable of header strings.
 */
export type TransposeColumnNamesArg = string | Iterable<string>;

/**
 * Configuration options for transposing rows and columns (`DataFrame.transpose()`).
 */
export interface TransposeOptions {
    /**
     * Column name or iterable of strings to use as transposed column headers.
     */
    columnNames?: TransposeColumnNamesArg;
    /**
     * Name of the header column when `includeHeader` is `true`.
     * @default "column"
     */
    headerName?: string;
    /**
     * When `true`, includes original column names as a new header column.
     * @default false
     */
    includeHeader?: boolean;
}

/**
 * Configuration options for unpivoting a DataFrame from wide to long format (`DataFrame.unpivot()`).
 */
export interface UnpivotOptions<T> {
    /**
     * Key column(s) to retain as identifier variables.
     */
    idVars: ColumnKeyArg<keyof T>;
    /**
     * Name for the new value column holding cell values.
     * @default "value"
     */
    valueName?: string;
    /**
     * Column(s) to unpivot into variable-value pairs.
     */
    valueVars: ColumnKeyArg<keyof T>;
    /**
     * Name for the new variable column holding old column headers.
     * @default "variable"
     */
    varName?: string;
}

/**
 * Reshaping direction for `DataFrame.unstack()`.
 */
export type UnstackDirection = "vertical" | "horizontal";

/**
 * Configuration options for reshaping columns into wider multi-column blocks (`DataFrame.unstack()`).
 */
export interface UnstackOptions {
    /**
     * Value to fill in empty cells when length is not evenly divisible by step.
     * @default null
     */
    fillValues?: any;
    /**
     * Reshaping direction:
     * - "vertical" (default): fills down the new columns first before moving to the next column.
     * - "horizontal": fills across row-by-row before moving to the next row.
     * @default "vertical"
     */
    how?: UnstackDirection;
    /**
     * Number of columns to reshape each input column into.
     */
    step: number;
}

/**
 * Minimal writable stream interface accepting string chunks.
 */
export interface WritableStreamTarget {
    /**
     * Writes a serialized string chunk to the underlying stream target.
     */
    write: (str: string) => void;
}

/**
 * Output destination for `writeCsv()` and `writeJson()`.
 * Accepts a file system path string or a writable stream object.
 */
export type WriteFileTargetArg = string | WritableStreamTarget;

/**
 * Configuration options for serializing a DataFrame to JSON or NDJSON (`DataFrame.writeJson()`).
 */
export interface WriteJSONOptions {
    /**
     * The format of the JSON output (`"json"` or `"ndjson"`).
     * @default "json"
     */
    format?: JSONFormat;
    /**
     * Options for the safe JSON replacer.
     */
    replacerOptions?: SafeJsonReplacerOptions;
}
