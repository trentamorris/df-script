import type { DataFrame } from "./dataframe/dataframe";
import type { RegisteredDataType } from "./datatypes";

export type { RegisteredDataType };

export type RowRecord = Record<string, any>;

export type ColumnData<T = any> = ArrayLike<T> & Iterable<T>;
export type ColumnDict = Record<string, ColumnData>;
export type DataFrameSchema = Record<string, RegisteredDataType>;

export type DataFrameColumns<T extends RowRecord> = {
    [K in keyof T]: ColumnData<T[K]>;
};

export type Scalar = string | number | boolean | bigint | Date | null | undefined;

export type AggFn<V, R = any> = (values: V[]) => R;
export type OpFn = (vals: ColumnData, columns: ColumnDict) => ColumnData;

export type IntoExpr = string | IExpr;

export interface IExpr {
    ops: OpFn[];
    colName?: string;
    outputName?: string;
    isLiteral?: boolean;
    literalValue?: any;
    aggFn?: AggFn<any> | null;
    groupingOpsIndex?: number;
    partitionOpsIndex?: number;
    partitionBy?: (string | IExpr)[] | null;
    windowOp?: { type: string;[key: string]: any } | null;
    isWindow?: boolean;
    alias(name: string): this;
    cast(dataType: RegisteredDataType): this;
    _resolve(val: any, columns: ColumnDict, height: number): ColumnData | any;
    evaluate(columns: ColumnDict, height: number): ColumnData;
    evaluatePreGrouping(columns: ColumnDict, height: number): ColumnData;
    evaluatePostGrouping(aggregatedArray: any[], columns: ColumnDict): ColumnData;
    evaluatePrePartition(columns: ColumnDict, height: number): ColumnData;
    evaluatePostPartition(aggregatedArray: any[], columns: ColumnDict): ColumnData;
    evaluateWindow?(groupPreValues: any[], partitionIndices: number[], currentIndex: number): any;
    debug(label?: string): this;
}

export type TimeUnit = "s" | "ms" | "us" | "ns";

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

export type { UniqueListStatsOptions, JoinListOptions } from "./utils/list";

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

