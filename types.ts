export type AggFn<V, R = any> = (values: V[]) => R;
export type OpFn = (val: any, row: any) => any;
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
    _resolve(val: any, row: any): any;
    evaluate(row: any): any;
    evaluatePreGrouping(row: any): any;
    evaluatePostGrouping(aggregatedValue: any, row: any): any;
    evaluatePrePartition(row: any): any;
    evaluatePostPartition(aggregatedValue: any, row: any): any;
    evaluateWindow?(partitionRows: any[], partitionIndices: number[], currentIndex: number): any;
}
export type ExprConstructor = new (...args: any[]) => IExpr;
export type TimeUnit = "s" | "ms" | "us" | "ns";
