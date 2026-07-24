import type { IExpr, OpFn, AggFn, ColumnData, ColumnDict, RegisteredDataType } from "../types"
import { ALL_COLUMNS_MARKER } from "./constants"
import { ColumnNotFoundError } from "../exceptions"
import { evaluateExpression } from "./utils"

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
    _ops: OpFn[] = [];
    _outputName: string = "";
    _isLiteral?: boolean;
    _literalValue?: any;
    _aggFn?: AggFn<any> | null = null;
    _groupingOpsIndex?: number;
    _partitionOpsIndex?: number;
    _partitionBy: (string | IExpr)[] | null = null;
    _evaluateWindow?: (groupPreValues: any[], partitionIndices: number[], currentIndex: number) => any;

    _evaluatePost(opsIndex: number | undefined, aggregatedArray: any[], columns: ColumnDict): ColumnData {
        const ops = this._ops;
        const idx = opsIndex !== undefined ? opsIndex : ops.length;
        let value: ColumnData = aggregatedArray;
        for (let i = idx; i < ops.length; i++) {
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

    _getInitialValue(columns: ColumnDict, height: number): ColumnData {
        const name = (this as any)._colName;
        if (name && name !== ALL_COLUMNS_MARKER && !name.startsWith(ALL_COLUMNS_MARKER) && !(name in columns)) {
            throw new ColumnNotFoundError(name);
        }
        const val = name && name !== ALL_COLUMNS_MARKER ? columns[name] : null;
        return val || new Array(height).fill(null);
    }

    _resolve(val: any, columns: ColumnDict, height: number) {
        if (val instanceof ExprBase) {
            if (val._isLiteral && val._ops.length === 1) {
                return val._literalValue;
            }
            return evaluateExpression(val, columns, height);
        }
        return val;
    }

    /**
     * Renames the output expression column key.
     */
    alias(name: string): this {
        const newInst = derive(this);
        newInst._outputName = name;
        return newInst;
    }

    /**
     * Coerces the column data type to another type.
     */
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

    /**
     * Prints the current evaluation intermediate array to console for debugging.
     */
    debug(label?: string): this {
        return derive(this, (vArray) => {
            console.log(`[DEBUG] ${label ? label + ': ' : ''}`, vArray);
            return vArray;
        }) as this;
    }

    evaluate(columns: ColumnDict, height: number): ColumnData {
        return this._evaluatePre(undefined, columns, height);
    }
}
