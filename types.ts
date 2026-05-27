export type AggFn<V, R = any> = (values: V[]) => R;
export type OpFn = (vals: any[], columns: Record<string, any[]>) => any[];
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
    _resolve(val: any, columns: Record<string, any[]>, height: number): any[] | any;
    evaluate(columns: Record<string, any[]>, height: number): any[];
    evaluatePreGrouping(columns: Record<string, any[]>, height: number): any[];
    evaluatePostGrouping(aggregatedArray: any[], columns: Record<string, any[]>): any[];
    evaluatePrePartition(columns: Record<string, any[]>, height: number): any[];
    evaluatePostPartition(aggregatedArray: any[], columns: Record<string, any[]>): any[];
    evaluateWindow?(groupPreValues: any[], partitionIndices: number[], currentIndex: number): any;
}
export type ExprConstructor = new (...args: any[]) => IExpr;
export type TimeUnit = "s" | "ms" | "us" | "ns";
