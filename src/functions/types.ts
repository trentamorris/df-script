/** @typefile */
import type { ColumnExpr } from "../columnExpressions/columnExpr";
import type { ArrayExprNamespace } from "../columnExpressions/mixins/arrayExpr";
import type { ComparisonArg } from "../columnExpressions/types";
import type {
    ColumnKeyArg,
    IntoExpr,
    RowRecord,
    ScalarArg,
    StructFieldsArg
} from "../types";
import type { RegisteredDataType } from "../datatypes";
import type { CumulativeStepContext, IndependentStepContext } from "../utils";

/**
 * Variadic operand for `$df.coalesce()`.
 * Accepts a scalar/column expression or an array of scalar/column expressions.
 */
export type CoalesceArg = ColumnKeyArg<ScalarArg>;

/**
 * Operand for `$df.duration()`.
 * Accepts a duration component options object or a duration interval string (e.g. `"1d 12h"`).
 */
export type DurationArg = DurationOptions | string;

/**
 * Numeric value or column expression representing a duration component.
 */
export type DurationComponentArg = IntoExpr | number;

/**
 * Configuration options for constructing a duration in `$df.duration()`.
 */
export interface DurationOptions {
    /** Number of days or column expression. */
    days?: DurationComponentArg;
    /** Number of hours or column expression. */
    hours?: DurationComponentArg;
    /** Number of microseconds or column expression. */
    microseconds?: DurationComponentArg;
    /** Number of milliseconds or column expression. */
    milliseconds?: DurationComponentArg;
    /** Number of minutes or column expression. */
    minutes?: DurationComponentArg;
    /** Number of nanoseconds or column expression. */
    nanoseconds?: DurationComponentArg;
    /** Number of seconds or column expression. */
    seconds?: DurationComponentArg;
    /** Number of weeks or column expression. */
    weeks?: DurationComponentArg;
}

/**
 * Return expression type of `$df.horizontal()`, combining `ColumnExpr` and `ArrayExprNamespace` methods.
 */
export type HorizontalExpr = ColumnExpr<any[]> & ArrayExprNamespace;

/**
 * Configuration options for `$df.lit()`.
 */
export interface LitOptions {
    /**
     * Registered data type to coerce and allocate for the literal column.
     */
    dtype?: RegisteredDataType;
    /**
     * Output column name alias.
     */
    name?: string;
}

/**
 * Configuration options for `$df.seqRange()`.
 */
export interface SeqRangeOptions {
    /**
     * Registered data type to coerce and allocate for the generated sequence.
     */
    dtype?: RegisteredDataType;
    /**
     * Ending row index (exclusive) in the DataFrame to insert the sequence (non-strict mode).
     */
    endIndex?: number;
    /**
     * Sequence generation mode: `"constant"` repeats the initial value, `"cumulative"` increments from the previous value, and `"independent"` computes each element from its row index.
     * @default "cumulative"
     */
    mode?: "constant" | "cumulative" | "independent";
    /**
     * Number of values to generate. Defaults to the slice or DataFrame height.
     */
    n?: number;
    /**
     * Output column name alias.
     */
    name?: string;
    /**
     * Pads the sequence with `padValue` if shorter than target slice range (non-strict mode).
     * @default false
     */
    pad?: boolean;
    /**
     * Value used for padding in non-strict mode.
     * @default null
     */
    padValue?: any;
    /**
     * Starting row index in the DataFrame to insert the sequence (non-strict mode).
     * @default 0
     */
    startIndex?: number;
    /**
     * Step increment/multiplier value or step callback function.
     * @default 1
     */
    step?: number | ((context: CumulativeStepContext & IndependentStepContext) => any);
    /**
     * When `true`, throws a `ShapeError` if the generated sequence height does not match the target height. When `false`, allows padding, truncation, and slice bounds.
     * @default true
     */
    strict?: boolean;
    /**
     * Truncates the sequence if it exceeds target slice range (non-strict mode).
     * @default false
     */
    truncate?: boolean;
}

/**
 * First parameter operand for `$df.struct()`.
 * Accepts a single expression, an array of expressions, or a dictionary mapping field names to expressions.
 */
export type StructArg = StructFieldsArg | IntoExpr;

/**
 * Condition or branch operand for `$df.when().then().otherwise()`.
 * Accepts a column expression, scalar literal, array, or record object.
 */
export type WhenArg = ComparisonArg | RowRecord | any[];
