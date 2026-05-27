import type { IExpr, OpFn, AggFn } from "../types"

// Legacy/temp kleene helper to avoid typescript compile issues during refactoring
export const kleene = (fn: any) => fn;

export const derive = <T extends IExpr>(instance: T, nextOp: OpFn): T => {
    const Constructor = instance.constructor as any;
    const newInst = new Constructor((instance as any).colName || "");
    Object.assign(newInst, instance);
    newInst.ops = [...instance.ops, nextOp];
    return newInst;
};

export class ExprBase implements IExpr {
    public ops: OpFn[] = [];
    public outputName: string = "";
    public aggFn?: AggFn<any> | null = null;
    public groupingOpsIndex?: number;
    public partitionOpsIndex?: number;
    public partitionBy: (string | IExpr)[] | null = null;

    public _resolve(val: any, columns: Record<string, any[]>, height: number) {
        return val && typeof val === "object" && "evaluate" in val 
            ? val.evaluate(columns, height) 
            : val;
    }

    alias(name: string): this {
        const Constructor = this.constructor as any;
        const newInst = new Constructor((this as any).colName || "");
        Object.assign(newInst, this);
        newInst.outputName = name;
        return newInst;
    }

    evaluate(columns: Record<string, any[]>, height: number): any[] {
        const name = (this as any).colName;
        let value = name && name !== "*" 
            ? (columns[name] || new Array(height).fill(null)) 
            : new Array(height).fill(null);

        const ops = this.ops;
        const len = ops.length;
        for (let i = 0; i < len; i++) {
            value = ops[i](value, columns);
        }
        return value;
    }

    private _evaluatePre(opsIndex: number | undefined, columns: Record<string, any[]>, height: number): any[] {
        const name = (this as any).colName;
        let value = name && name !== "*" 
            ? (columns[name] || new Array(height).fill(null)) 
            : new Array(height).fill(null);
        const ops = this.ops;
        const idx = opsIndex !== undefined ? opsIndex : ops.length;
        for (let i = 0; i < idx; i++) {
            value = ops[i](value, columns);
        }
        return value;
    }

    private _evaluatePost(opsIndex: number | undefined, aggregatedArray: any[], columns: Record<string, any[]>): any[] {
        const ops = this.ops;
        const idx = opsIndex !== undefined ? opsIndex : ops.length;
        let value = aggregatedArray;
        for (let i = idx; i < ops.length; i++) {
            value = ops[i](value, columns);
        }
        return value;
    }

    evaluatePrePartition(columns: Record<string, any[]>, height: number): any[] {
        return this._evaluatePre(this.partitionOpsIndex, columns, height);
    }

    evaluatePostPartition(aggregatedArray: any[], columns: Record<string, any[]>): any[] {
        return this._evaluatePost(this.partitionOpsIndex, aggregatedArray, columns);
    }

    evaluatePreGrouping(columns: Record<string, any[]>, height: number): any[] {
        return this._evaluatePre(this.groupingOpsIndex, columns, height);
    }

    evaluatePostGrouping(aggregatedArray: any[], columns: Record<string, any[]>): any[] {
        return this._evaluatePost(this.groupingOpsIndex, aggregatedArray, columns);
    }
}
