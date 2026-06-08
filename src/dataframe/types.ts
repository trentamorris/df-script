import type { IExpr, AggFn, RowRecord } from "../types";
import type { DataFrame } from "./dataframe";

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

