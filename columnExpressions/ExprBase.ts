import type { IExpr, OpFn, AggFn } from "../types"

export const kleene = (fn: (v: any, row: any) => any) => (v: any, row: any) => (v == null ? v : fn(v, row))

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

    public _resolve(val: any, row: any) {
        return val?.evaluate ? val.evaluate(row) : val 
    }

    alias(name: string): this {
        const Constructor = this.constructor as any;
        const newInst = new Constructor((this as any).colName || "");
        Object.assign(newInst, this);
        newInst.outputName = name;
        return newInst;
    }

    evaluate(row: any): any {
        const name = (this as any).colName
        let value = name ? row[name] : row;

        const ops = this.ops;
        const len = ops.length;
        for (let i = 0; i < len; i++) {
            value = ops[i](value, row);
        }
        return value;
    }

    private _evaluatePre(opsIndex: number | undefined, row: any): any {
        const name = (this as any).colName;
        let value = name && name !== "*" ? row[name] : row;
        const ops = this.ops;
        const idx = opsIndex !== undefined ? opsIndex : ops.length;
        for (let i = 0; i < idx; i++) {
            value = ops[i](value, row);
        }
        return value;
    }

    private _evaluatePost(opsIndex: number | undefined, aggregatedValue: any, row: any): any {
        const ops = this.ops;
        const idx = opsIndex !== undefined ? opsIndex : ops.length;
        let value = aggregatedValue;
        for (let i = idx; i < ops.length; i++) {
            value = ops[i](value, row);
        }
        return value;
    }

    evaluatePrePartition(row: any): any {
        return this._evaluatePre(this.partitionOpsIndex, row);
    }

    evaluatePostPartition(aggregatedValue: any, row: any): any {
        return this._evaluatePost(this.partitionOpsIndex, aggregatedValue, row);
    }

    evaluatePreGrouping(row: any): any {
        return this._evaluatePre(this.groupingOpsIndex, row);
    }

    evaluatePostGrouping(aggregatedValue: any, row: any): any {
        return this._evaluatePost(this.groupingOpsIndex, aggregatedValue, row);
    }

    evaluateWindow(partitionRows: any[], partitionIndices: number[], currentIndex: number): any {
        if (this.aggFn) {
            const preValues = partitionRows.map(r => this.evaluatePrePartition(r));
            const aggregated = this.aggFn(preValues);
            return this.evaluatePostPartition(aggregated, partitionRows[currentIndex]);
        }
        return this.evaluate(partitionRows[currentIndex]);
    }
}
