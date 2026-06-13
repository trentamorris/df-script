import type { IExpr, AggFn, RowRecord, DataFrameSchema, JSONFormat } from "../types";
import type { DataFrame } from "./dataframe";
import type { JSONParseOptions } from "../utils";

export type JoinType = "inner" | "left" | "outer" | "right";
export type LimitPosition = "start" | "end";
export type GroupMap = Map<string, number[]>;

export interface LimitOptions {
    offset?: number;
    from?: LimitPosition;
}

export interface SortOptions<T> {
    by: keyof T | (keyof T)[] | IExpr | IExpr[];
    descending?: boolean | boolean[];
    nullsLast?: boolean;
    custom?: Partial<Record<keyof T, (a: any, b: any) => number>>;
}

export interface PivotOptions<T> {
    index: (keyof T) | (keyof T)[];
    columns: keyof T;
    values: keyof T;
    agg?: AggFn<any> | string;
}

export interface JoinOptions<T, U extends RowRecord = any> {
    other: DataFrame<U>;
    on: (keyof T & keyof U) | (keyof T & keyof U)[];
    how?: JoinType;
    suffixes?: [string, string];
}

export interface UnpivotOptions<T> {
    idVars: (keyof T) | (keyof T)[];
    valueVars: (keyof T) | (keyof T)[];
    varName?: string;
    valueName?: string;
}

export interface TransposeOptions {
    include_header?: boolean;
    header_name?: string;
    column_names?: string | Iterable<string>;
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
     * A replacer function or array passed directly to JSON.stringify for custom value serialization.
     */
    replacer?: JSONStringifyReplacer;
}

