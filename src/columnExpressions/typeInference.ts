import type { IExpr, DataFrameSchema, RegisteredDataType, DatetimeTimeUnit, ColumnData } from "../types";
import {
    DatetimeType,
    DurationType,
    ArrayType,
    StructType,
    Float64Type,
    Float32Type,
    DecimalType
} from "../datatypes/types";
import { DataType, DataTypeRegistry } from "../datatypes";
import {
    isValidDateObj,
    isValidNumber,
    isValidInt,
    isValidBigInt,
    isValidBinary,
    isTypedArray,
    isObj,
    unboxPrimitiveObj,
    typedArrayTagGetter
} from "../utils";
import { isExpr } from "./ExprBase";

const _TYPED_ARRAY_MAP: Record<string, RegisteredDataType> = {
    Int8Array: DataTypeRegistry.Int8,
    Uint8Array: DataTypeRegistry.UInt8,
    Uint8ClampedArray: DataTypeRegistry.UInt8,
    Int16Array: DataTypeRegistry.Int16,
    Uint16Array: DataTypeRegistry.UInt16,
    Int32Array: DataTypeRegistry.Int32,
    Uint32Array: DataTypeRegistry.UInt32,
    BigInt64Array: DataTypeRegistry.Int64,
    BigUint64Array: DataTypeRegistry.UInt64,
    Float32Array: DataTypeRegistry.Float32,
    Float64Array: DataTypeRegistry.Float64
};

/**
 * Resolves the DataType for an expression operand, whether it is an IExpr, a DataType, a literal value, or a column name.
 */
function _resolveOperandType(
    operand: unknown,
    schema: DataFrameSchema
): RegisteredDataType | undefined {
    if (operand == null) return undefined;
    if (operand instanceof DataType) return operand as RegisteredDataType;
    if (isExpr(operand)) return resolveExprOutputType(operand, schema);

    const unboxed = unboxPrimitiveObj(operand);

    // 1. Primitives & Scalars
    if (typeof unboxed === "string") return schema[unboxed] ?? DataTypeRegistry.Utf8;
    if (typeof unboxed === "boolean") return DataTypeRegistry.Boolean;
    if (typeof unboxed === "bigint") {
        return isValidBigInt(unboxed, { range: "Int64" }) ? DataTypeRegistry.Int64 : DataTypeRegistry.UInt64;
    }
    if (isValidNumber(unboxed)) {
        if (isValidInt(unboxed, { range: "Int32" })) return DataTypeRegistry.Int32;
        return Number.isInteger(unboxed) ? DataTypeRegistry.Int64 : DataTypeRegistry.Float64;
    }
    if (isValidDateObj(unboxed)) return DataTypeRegistry.Datetime;
    if (isValidBinary(unboxed, { strict: true })) return DataTypeRegistry.Binary;

    // 2. Collections & Structures
    if (Array.isArray(unboxed)) {
        let innerType: RegisteredDataType | undefined;
        const len = unboxed.length;
        for (let i = 0; i < len; i++) {
            const item = unboxed[i];
            if (item != null && (innerType = _resolveOperandType(item, schema))) break;
        }
        return DataTypeRegistry.Array(innerType ?? DataTypeRegistry.Utf8);
    }

    if (isTypedArray(unboxed)) {
        const tag = typedArrayTagGetter ? typedArrayTagGetter.call(unboxed) : (unboxed as any).constructor.name;
        const inner = _TYPED_ARRAY_MAP[tag];
        return inner ? DataTypeRegistry.Array(inner) : DataTypeRegistry.Binary;
    }

    if (isObj(unboxed)) return DataTypeRegistry.Object;

    return undefined;
}

const _INT_PRECEDENCE = ["64", "32", "16", "8"] as const;

/**
 * Deduces the output DataType of a binary arithmetic operation between two DataTypes.
 */
function _deduceBinaryType(
    leftType: RegisteredDataType | undefined,
    rightType: RegisteredDataType | undefined,
    colSample?: ColumnData | any[]
): RegisteredDataType | undefined {
    if (!leftType || !rightType) return undefined;

    // Check if result column has boolean type
    if (colSample && colSample.length > 0) {
        let hasBool = false;
        for (let i = 0; i < colSample.length; i++) {
            const v = colSample[i];
            if (v == null) continue;
            if (typeof v !== "boolean") { hasBool = false; break; }
            hasBool = true;
        }
        if (hasBool) return DataTypeRegistry.Boolean;
    }

    const leftIsDuration = leftType instanceof DurationType;
    const rightIsDuration = rightType instanceof DurationType;
    const leftIsTemporal = leftType.isTemporal && !leftIsDuration;
    const rightIsTemporal = rightType.isTemporal && !rightIsDuration;

    // 1. Temporal / Duration Operations
    if (leftIsTemporal || rightIsTemporal) {
        if (leftIsTemporal && rightIsTemporal) {
            const unit: DatetimeTimeUnit = (leftType as DatetimeType).timeUnit || (rightType as DatetimeType).timeUnit || "ms";
            return new DurationType(unit);
        }
        return leftIsTemporal ? leftType : rightType;
    }
    if (leftIsDuration || rightIsDuration) {
        return leftIsDuration ? leftType : rightType;
    }

    // 2. String Concatenation: Utf8 + any or any + Utf8 -> Utf8
    if (leftType.isUtf8 || rightType.isUtf8) {
        return DataTypeRegistry.Utf8;
    }

    // 3. Numeric Promotion Matrix across all Integer / Float / Decimal types
    if (leftType.isNumeric && rightType.isNumeric) {
        const hasFloat64 = leftType instanceof Float64Type || rightType instanceof Float64Type;
        const hasFloat32 = leftType instanceof Float32Type || rightType instanceof Float32Type;
        const hasDecimal = leftType instanceof DecimalType || rightType instanceof DecimalType;

        if (hasFloat64 || (hasFloat32 && hasDecimal)) return DataTypeRegistry.Float64;
        if (hasFloat32) return DataTypeRegistry.Float32;
        if (hasDecimal) return leftType instanceof DecimalType ? leftType : rightType;

        // If resulting values are non-integers (e.g. division 10 / 3 = 3.333), infer Float64
        if (colSample !== undefined) {
            const range = { range: { min: -Infinity, max: Infinity } } as const;
            const len = colSample.length;
            for (let i = 0; i < len; i++) {
                const v = colSample[i];
                if (isValidNumber(v) && !isValidInt(v, range)) return DataTypeRegistry.Float64;
            }
        }

        // Integer Width & Signedness Resolution (64 > 32 > 16 > 8)
        if (leftType === rightType) return leftType;
        const l = leftType.name;
        const r = rightType.name;

        for (let i = 0; i < 4; i++) {
            const width = _INT_PRECEDENCE[i];
            if (l.endsWith(width) || r.endsWith(width)) {
                return (width !== "64" && l === `UInt${width}` && r === `UInt${width}`)
                    ? (DataTypeRegistry as any)[`UInt${width}`]
                    : (DataTypeRegistry as any)[`Int${width}`];
            }
        }
    }

    return undefined;
}

/**
 * Resolves the output DataType of an expression given the input DataFrame schema and evaluated column.
 */
export function resolveExprOutputType(
    expr: IExpr,
    schema: DataFrameSchema,
    colSample?: ColumnData | any[]
): RegisteredDataType | undefined {
    if (!expr) return undefined;

    // 1. Direct explicit overrides & literals
    if (expr._castType) return expr._castType;
    if ((expr as any)._targetType instanceof DataType) return (expr as any)._targetType;
    if (expr._isLiteral && expr._literalValue !== undefined) return _resolveOperandType(expr._literalValue, schema);

    // 2. Expression AST branches (binary, coalesce/when-then, struct field)
    if (expr._binaryMeta) {
        return _deduceBinaryType(
            _resolveOperandType(expr._binaryMeta._left, schema),
            _resolveOperandType(expr._binaryMeta._right, schema),
            colSample
        );
    }
    if (expr._branchOperands) {
        let inferred: RegisteredDataType | undefined;
        const len = expr._branchOperands.length;
        for (let i = 0; i < len; i++) {
            const t = _resolveOperandType(expr._branchOperands[i], schema);
            if (!t) continue;
            if (!inferred) inferred = t;
            else if (inferred !== t) {
                if (inferred.isNumeric && t.isNumeric) {
                    inferred = _deduceBinaryType(inferred, t, colSample) ?? inferred;
                }
            }
        }
        if (inferred) return inferred;
    }
    if (expr._baseExpr && expr._fieldName) {
        const parent = _resolveOperandType(expr._baseExpr, schema);
        if (parent instanceof StructType) return parent.fields?.[expr._fieldName];
    }

    const baseType = expr._colName ? schema[expr._colName] : undefined;
    const sampleVal = colSample?.[0];
    const isBareCol = (!expr._ops || expr._ops.length === 0) && !expr._aggFn && !expr._evaluateWindow;

    // 3. Schema column references & transformations
    if (baseType) {
        if (baseType instanceof ArrayType && (expr._isUnnest || (colSample as any)?.rowMap)) return baseType.innerType;
        if (!(baseType instanceof ArrayType) && Array.isArray(sampleVal)) return DataTypeRegistry.Array(baseType);
        if (isBareCol) return baseType;
        if (baseType.isTemporal && expr._aggFn && (isValidDateObj(sampleVal) || typeof sampleVal === "string")) return baseType;
        if (baseType instanceof DurationType && expr._aggFn && isValidNumber(sampleVal)) return baseType;
    }

    // 4. Statistical aggregations
    if (expr._aggFn && isValidNumber(sampleVal)) {
        if (!Number.isInteger(sampleVal) || (baseType?.isNumeric && !(baseType instanceof DurationType))) {
            return DataTypeRegistry.Float64;
        }
        return DataTypeRegistry.Int32;
    }

    return undefined;
}