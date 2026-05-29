export type ColumnData<T = any> = ArrayLike<T> & Iterable<T>;

export type DataFrameColumns<T extends Record<string, any>> = {
    [K in keyof T]: ColumnData<T[K]>;
};

export type AggFn<V, R = any> = (values: V[]) => R;
export type OpFn = (vals: ColumnData, columns: Record<string, ColumnData>) => ColumnData;

export interface IExpr {
    ops: OpFn[];
    colName?: string;
    outputName?: string;
    aggFn?: AggFn<any> | null;
    groupingOpsIndex?: number;
    partitionOpsIndex?: number;
    partitionBy?: (string | IExpr)[] | null;
    windowOp?: { type: string; [key: string]: any } | null;
    isWindow?: boolean;
    alias(name: string): this;
    fill_null(value: any): this;
    cast(dataType: any): this;
    _resolve(val: any, columns: Record<string, ColumnData>, height: number): ColumnData | any;
    evaluate(columns: Record<string, ColumnData>, height: number): ColumnData;
    evaluatePreGrouping(columns: Record<string, ColumnData>, height: number): ColumnData;
    evaluatePostGrouping(aggregatedArray: any[], columns: Record<string, ColumnData>): ColumnData;
    evaluatePrePartition(columns: Record<string, ColumnData>, height: number): ColumnData;
    evaluatePostPartition(aggregatedArray: any[], columns: Record<string, ColumnData>): ColumnData;
    evaluateWindow?(groupPreValues: any[], partitionIndices: number[], currentIndex: number): any;
    debug(label?: string): this;
}

export type TimeUnit = "s" | "ms" | "us" | "ns";
