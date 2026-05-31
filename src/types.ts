import type { DataFrame } from "./dataframe/dataframe";

export type ColumnData<T = any> = ArrayLike<T> & Iterable<T>;
export type ColumnDict = Record<string, ColumnData>;

export type DataFrameColumns<T extends Record<string, any>> = {
    [K in keyof T]: ColumnData<T[K]>;
};

export type Scalar = string | number | boolean | bigint | Date | null | undefined;

export type AggFn<V, R = any> = (values: V[]) => R;
export type OpFn = (vals: ColumnData, columns: ColumnDict) => ColumnData;

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
    cast(dataType: any): this;
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
export type ConcatItem = DataFrame<any> | ColumnDict | Record<string, any>[];
