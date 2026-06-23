import type { IExpr, OpFn, AggFn, ColumnData, ColumnDict, RegisteredDataType } from "../types"
import { ALL_COLUMNS_MARKER } from "./constants"
import { ColumnNotFoundError } from "../exceptions"

export const derive = <T extends IExpr>(
    instance: T,
    nextOp?: OpFn
): T => {
    const Constructor = instance.constructor as any;
    const colNameVal = (instance as any)._colNames || (instance as any)._colName || "";
    const newInst = new Constructor(colNameVal);
    Object.assign(newInst, instance);
    newInst._ops = nextOp ? [...instance._ops, nextOp] : [...instance._ops];
    return newInst;
};

export class ExprBase implements IExpr {
    public _ops: OpFn[] = [];
    public _outputName: string = "";
    public _isLiteral?: boolean;
    public _literalValue?: any;
    public _aggFn?: AggFn<any> | null = null;
    public _groupingOpsIndex?: number;
    public _partitionOpsIndex?: number;
    public _partitionBy: (string | IExpr)[] | null = null;
    public _evaluateWindow?: (groupPreValues: any[], partitionIndices: number[], currentIndex: number) => any;

    public _resolve(val: any, columns: ColumnDict, height: number) {
        if (val instanceof ExprBase) {
            if (val._isLiteral && val._ops.length === 1) {
                return val._literalValue;
            }
            return val.evaluate(columns, height);
        }
        return val;
    }

    alias(name: string): this {
        const newInst = derive(this);
        newInst._outputName = name;
        return newInst;
    }

    cast(dataType: RegisteredDataType): this {
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

    private _getInitialValue(columns: ColumnDict, height: number): ColumnData {
        const name = (this as any)._colName;
        if (name && name !== ALL_COLUMNS_MARKER && !name.startsWith("*") && !(name in columns)) {
            throw new ColumnNotFoundError(name);
        }
        return name && name !== ALL_COLUMNS_MARKER
            ? (columns[name] || new Array(height).fill(null))
            : new Array(height).fill(null);
    }

    evaluate(columns: ColumnDict, height: number): ColumnData {
        let value = this._getInitialValue(columns, height);
        const ops = this._ops;
        const len = ops.length;
        for (let i = 0; i < len; i++) {
            value = ops[i](value, columns);
        }
        return value as ColumnData;
    }

    _evaluatePre(opsIndex: number | undefined, columns: ColumnDict, height: number): ColumnData {
        let value = this._getInitialValue(columns, height);
        const ops = this._ops;
        const idx = opsIndex !== undefined ? opsIndex : ops.length;
        for (let i = 0; i < idx; i++) {
            value = ops[i](value, columns);
        }
        return value as ColumnData;
    }

    _evaluatePost(opsIndex: number | undefined, aggregatedArray: any[], columns: ColumnDict): ColumnData {
        const ops = this._ops;
        const idx = opsIndex !== undefined ? opsIndex : ops.length;
        let value: ColumnData = aggregatedArray;
        for (let i = idx; i < ops.length; i++) {
            value = ops[i](value, columns);
        }
        return value as ColumnData;
    }
}
