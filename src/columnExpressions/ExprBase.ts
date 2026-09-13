import type { IExpr, OpFn, AggFn, ColumnData, ColumnDict, RegisteredDataType, CastOptions } from "../types"
import { ALL_COLUMNS_MARKER } from "./constants"
import { ColumnNotFoundError, assertNotNull } from "../exceptions"
import { evaluateExpression, kleeneUnary, kleeneBinary } from "./utils"
import { isObj } from "../utils"

const _derive = <T extends IExpr>(
    instance: T,
    nextOp?: OpFn
): T => {
    const Constructor = instance.constructor as any;
    const colNameVal = (instance as any)._colNames || (instance as any)._colName || "";
    const newInst = new Constructor(colNameVal);
    Object.assign(newInst, instance);
    newInst._ops = nextOp ? [...instance._ops, nextOp] : [...instance._ops];
    if (nextOp && (nextOp as any)._binaryMeta) {
        newInst._binaryMeta = (nextOp as any)._binaryMeta;
    }
    return newInst;
};

export function isExpr(v: unknown): v is IExpr { return v instanceof ExprBase; };

export function isColExpr(v: unknown): v is IExpr {
    return v instanceof ExprBase || (isObj(v) && typeof (v as any).evaluate === "function");
}

export function toColExpr<T extends IExpr = IExpr>(col: any, contextExpr?: any): T {
    assertNotNull(col, "Column reference can't be null or undefined.");
    if (isColExpr(col)) {
        return col as T;
    }
    const Constructor = typeof contextExpr === "function" ? contextExpr : (contextExpr && contextExpr.constructor) || ExprBase;
    return new Constructor(col);
}

/**
 * @namespace $df.col
 * @category ColumnExpression
 * @syntax $df.col(<column_name>).{symbol}(...)
 */
export class ExprBase implements IExpr {
    _ops: OpFn[] = [];
    _outputName: string = "";
    _isLiteral?: boolean;
    _literalValue?: any;
    _aggFn?: AggFn<any> | null = null;
    _castType?: RegisteredDataType;
    _binaryMeta?: { _left: any; _right: any };
    _groupingOpsIndex?: number;
    _partitionOpsIndex?: number;
    _partitionBy: (string | IExpr)[] | null = null;
    _evaluateWindow?: (groupPreValues: any[], partitionIndices: number[], currentIndex: number) => any;
    _baseExpr?: IExpr;
    _fieldName?: string;
    _isUnnest?: boolean;

    _derive(op?: OpFn): this {
        return _derive(this, op) as this;
    }

    _deriveBinary(other: any, fn: (v: any, r: any) => any) {
        return _derive(this, kleeneBinary(this, other, fn));
    }

    _deriveUnary(fn: (v: any) => any) {
        return _derive(this, kleeneUnary(fn));
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

    _isColExpr(v: unknown): v is IExpr {
        return isColExpr(v);
    }

    _isGlobalAgg(): boolean {
        return this._aggFn != null && (!this._partitionBy || this._partitionBy.length === 0);
    }

    _resolve(val: any, columns: ColumnDict, height: number) {
        if (val instanceof ExprBase) {
            if (val._isLiteral) {
                return val._literalValue;
            }
            return evaluateExpression(val, columns, height);
        }
        return val;
    }

    _toColExpr(col: any): any {
        return toColExpr(col, this);
    }

    /**
     * Renames the output expression column key.
     */
    alias(name: string): this {
        const newInst = this._derive();
        newInst._outputName = name;
        return newInst;
    }

    /**
     * Coerces the column data type to another type.
     */
    cast(dataType: RegisteredDataType, options: CastOptions = {}): this {
        const strict = options.strict ?? true;
        const derivedInst = this._deriveUnary((v) => strict ? dataType.coerce(v) : (() => {
            try { return dataType.coerce(v); } catch { return null; }
        })());
        derivedInst._castType = dataType;
        return derivedInst as this;
    }

    /**
     * Prints the current evaluation intermediate array to console for debugging.
     */
    debug(label?: string): this {
        return this._derive((vArray) => {
            console.log(`[DEBUG] ${label ? label + ': ' : ''}`, vArray);
            return vArray;
        });
    }

    evaluate(columns: ColumnDict, height: number): ColumnData {
        return this._evaluatePre(undefined, columns, height);
    }
}
