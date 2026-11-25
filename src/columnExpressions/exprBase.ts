/** @internalfile */
import type { BinaryMeta, ColumnExprInternal } from "./types"
import type { IExpr, OpFn, AggFn, ColumnData, ColumnDict } from "../types"
import type { RegisteredDataType } from "../datatypes"
import { ALL_COLUMNS_MARKER } from "./constants"
import { ColumnNotFoundError, assertNotNull } from "../exceptions"
import { evaluateExpression, kleeneUnary, kleeneBinary } from "./utils"
import { isObj } from "../utils"

function _derive<T extends IExpr>(
    instance: T,
    nextOp?: OpFn
): T {
    const Constructor = instance.constructor as new (colName: unknown) => T;
    const instObj = instance as unknown as ColumnExprInternal;
    const colNameVal = instObj._colNames || instObj._colName || "";
    const newInst = new Constructor(colNameVal);
    Object.assign(newInst, instance);
    newInst._ops = nextOp ? [...instance._ops, nextOp] : [...instance._ops];
    const nextOpMeta = nextOp ? (nextOp as unknown as { _binaryMeta?: BinaryMeta })._binaryMeta : undefined;
    if (nextOpMeta) {
        newInst._binaryMeta = nextOpMeta;
    }
    return newInst;
}

export function isExpr(v: unknown): v is IExpr { return v instanceof ExprBase; };

export function isColExpr(v: unknown): v is IExpr {
    return v instanceof ExprBase || (isObj(v) && typeof (v as ColumnExprInternal)._evaluate === "function");
}

export function toColExpr<T extends IExpr = IExpr>(col: unknown, contextExpr?: unknown): T {
    assertNotNull(col, "Column reference can't be null or undefined.");
    if (isColExpr(col)) {
        return col as T;
    }
    const Constructor = (typeof contextExpr === "function" ? contextExpr : (contextExpr && (contextExpr as { constructor?: unknown }).constructor) || ExprBase) as new (col: unknown) => T;
    return new Constructor(col);
}

/**
 * @namespace $df.col
 * @syntax $df.col(<column_name>).{symbol}(...)
 */
export class ExprBase implements IExpr {
    _ops: OpFn[] = [];
    _outputName: string = "";
    _isLiteral?: boolean;
    _literalValue?: unknown;
    _aggFn?: AggFn<unknown> | null = null;
    _castType?: RegisteredDataType;
    _binaryMeta?: { _left: unknown; _right: unknown };
    _groupingOpsIndex?: number;
    _partitionOpsIndex?: number;
    _partitionBy: (string | IExpr)[] | null = null;
    _evaluateWindow?: (groupPreValues: unknown[], partitionIndices: number[], currentIndex: number) => unknown;
    _baseExpr?: IExpr;
    _fieldName?: string;
    _isUnnest?: boolean;

    _debug(label?: string): this {
        return this._derive((vArray) => {
            console.log(`[DEBUG] ${label ? label + ': ' : ''}`, vArray);
            return vArray;
        });
    }

    _derive(op?: OpFn): this {
        return _derive(this, op) as this;
    }

    _deriveBinary<L = number, R = number, Out = unknown>(other: unknown, fn: (v: L, r: R) => Out) {
        return _derive(this, kleeneBinary(this, other, fn as (v: unknown, r: unknown) => unknown));
    }

    _deriveUnary<V = number, Out = unknown>(fn: (v: V) => Out) {
        return _derive(this, kleeneUnary(fn as (v: unknown) => unknown));
    }

    _evaluate(columns: ColumnDict, height: number): ColumnData {
        return this._evaluatePre(undefined, columns, height);
    }

    _evaluatePost(opsIndex: number | undefined, aggregatedArray: unknown[], columns: ColumnDict): ColumnData {
        let value: ColumnData = aggregatedArray;
        const ops = this._ops;
        const start = opsIndex !== undefined ? opsIndex : 0;
        const len = ops.length;
        for (let i = start; i < len; i++) {
            value = ops[i](value, columns);
        }
        return value;
    }

    _evaluatePre(opsIndex: number | undefined, columns: ColumnDict, height: number): ColumnData {
        let value = this._getInitialValue(columns, height);
        const ops = this._ops;
        const end = opsIndex !== undefined ? opsIndex : ops.length;
        for (let i = 0; i < end; i++) {
            value = ops[i](value, columns);
        }
        return value;
    }

    _getInitialValue(columns: ColumnDict, height: number): ColumnData {
        const name = (this as unknown as ColumnExprInternal)._colName;
        if (name && (name in columns)) {
            return columns[name];
        }
        if (name && name !== ALL_COLUMNS_MARKER && !name.startsWith(ALL_COLUMNS_MARKER)) {
            throw new ColumnNotFoundError(name);
        }
        return new Array(height).fill(null);
    }

    _isColExpr(v: unknown): v is IExpr {
        return isColExpr(v);
    }

    _isGlobalAgg(): boolean {
        return this._aggFn != null && (!this._partitionBy || this._partitionBy.length === 0);
    }

    _resolve(val: unknown, columns: ColumnDict, height: number) {
        if (val instanceof ExprBase) {
            return val._isLiteral ? val._literalValue : evaluateExpression(val, columns, height);
        }
        return val;
    }

    _toColExpr(col: unknown): unknown {
        return toColExpr(col, this);
    }
}
