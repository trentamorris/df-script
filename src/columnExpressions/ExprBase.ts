import type { IExpr, OpFn, AggFn, ColumnData } from "../types"
import { isArrayOrTypedArray } from "../utils"
import type { DataType } from "../datatypes"

export const kleeneUnary = (fn: (v: any) => any) => {
    return (vArray: ColumnData) => {
        const height = vArray.length;
        const result = new Array(height);
        for (let i = 0; i < height; i++) {
            const v = vArray[i];
            result[i] = v == null ? null : fn(v);
        }
        return result;
    };
};

export const kleeneBinary = (expr: IExpr, other: any, fn: (v: any, r: any) => any) => {
    return (vArray: ColumnData, columns: Record<string, ColumnData>) => {
        const height = vArray.length;
        const rResolved = expr._resolve(other, columns, height);
        const result = new Array(height);
        if (isArrayOrTypedArray(rResolved)) {
            for (let i = 0; i < height; i++) {
                const v = vArray[i];
                const r = (rResolved as any)[i];
                result[i] = (v == null || r == null) ? null : fn(v, r);
            }
        } else {
            for (let i = 0; i < height; i++) {
                const v = vArray[i];
                result[i] = (v == null || rResolved == null) ? null : fn(v, rResolved);
            }
        }
        return result;
    };
};

export const derive = <T extends IExpr>(
    instance: T,
    nextOp?: OpFn
): T => {
    const Constructor = instance.constructor as any;
    const newInst = new Constructor((instance as any).colName || "");
    Object.assign(newInst, instance);
    newInst.ops = nextOp ? [...instance.ops, nextOp] : [...instance.ops];
    return newInst;
};

export class ExprBase implements IExpr {
    public ops: OpFn[] = [];
    public outputName: string = "";
    public aggFn?: AggFn<any> | null = null;
    public groupingOpsIndex?: number;
    public partitionOpsIndex?: number;
    public partitionBy: (string | IExpr)[] | null = null;

    public _resolve(val: any, columns: Record<string, ColumnData>, height: number) {
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

    fill_null(value: any): this {
        return derive(this, (vArray, columns) => {
            const height = vArray.length;
            const resolved = this._resolve(value, columns, height);
            const result = new Array(height);
            if (isArrayOrTypedArray(resolved)) {
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? resolved[i] : v;
                }
            } else {
                for (let i = 0; i < height; i++) {
                    const v = vArray[i];
                    result[i] = v == null ? resolved : v;
                }
            }
            return result;
        }) as this;
    }

    cast(dataType: DataType): this {
        return derive(this, (vArray) => {
            const height = vArray.length;
            const result = new Array(height);
            for (let i = 0; i < height; i++) {
                result[i] = dataType.coerce(vArray[i]);
            }
            return result;
        }) as this;
    }

    debug(label?: string): this {
        return derive(this, (vArray) => {
            console.log(`[DEBUG] ${label ? label + ': ' : ''}`, vArray);
            return vArray;
        }) as this;
    }



    evaluate(columns: Record<string, ColumnData>, height: number): ColumnData {
        const name = (this as any).colName;
        let value = name && name !== "*" 
            ? (columns[name] || new Array(height).fill(null)) 
            : new Array(height).fill(null);

        const ops = this.ops;
        const len = ops.length;
        for (let i = 0; i < len; i++) {
            value = ops[i](value, columns);
        }
        return value as ColumnData;
    }

    private _evaluatePre(opsIndex: number | undefined, columns: Record<string, ColumnData>, height: number): ColumnData {
        const name = (this as any).colName;
        let value = name && name !== "*" 
            ? (columns[name] || new Array(height).fill(null)) 
            : new Array(height).fill(null);
        const ops = this.ops;
        const idx = opsIndex !== undefined ? opsIndex : ops.length;
        for (let i = 0; i < idx; i++) {
            value = ops[i](value, columns);
        }
        return value as ColumnData;
    }

    private _evaluatePost(opsIndex: number | undefined, aggregatedArray: any[], columns: Record<string, ColumnData>): ColumnData {
        const ops = this.ops;
        const idx = opsIndex !== undefined ? opsIndex : ops.length;
        let value: ColumnData = aggregatedArray;
        for (let i = idx; i < ops.length; i++) {
            value = ops[i](value, columns);
        }
        return value as ColumnData;
    }

    evaluatePrePartition(columns: Record<string, ColumnData>, height: number): ColumnData {
        return this._evaluatePre(this.partitionOpsIndex, columns, height);
    }

    evaluatePostPartition(aggregatedArray: any[], columns: Record<string, ColumnData>): ColumnData {
        return this._evaluatePost(this.partitionOpsIndex, aggregatedArray, columns);
    }

    evaluatePreGrouping(columns: Record<string, ColumnData>, height: number): ColumnData {
        return this._evaluatePre(this.groupingOpsIndex, columns, height);
    }

    evaluatePostGrouping(aggregatedArray: any[], columns: Record<string, ColumnData>): ColumnData {
        return this._evaluatePost(this.groupingOpsIndex, aggregatedArray, columns);
    }
}
