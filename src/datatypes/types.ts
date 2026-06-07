import {
    DataType,
    SignedIntegerType,
    UnsignedIntegerType,
    FloatDataType,
    TemporalDataType,
    NestedDataType,
    NumericDataType
} from "./DataType";
import {
    toValidInt,
    toValidBigInt,
    toValidFloat,
    toValidDecimal,
    toValidDate,
    toValidBinary,
    toValidNumber,
    isArrayOrTypedArray,
    isObj,
    TIME_PREFIX_REGEX,
    ZONE_OFFSET_REGEX,
    isValidDateObj
} from "../utils";
import type { RowRecord } from "../types";

// ============================================================================
// Numeric Types
// ============================================================================

export class Int8Type extends SignedIntegerType {
    readonly name = "Int8";
    coerce(val: unknown): number | null { return toValidInt(val, "Int8"); }
    equals(other: DataType): boolean { return other.name === "Int8"; }
    allocate(size: number): Int8Array { return new Int8Array(size); }
}
export const Int8 = new Int8Type();

export class Int16Type extends SignedIntegerType {
    readonly name = "Int16";
    coerce(val: unknown): number | null { return toValidInt(val, "Int16"); }
    equals(other: DataType): boolean { return other.name === "Int16"; }
    allocate(size: number): Int16Array { return new Int16Array(size); }
}
export const Int16 = new Int16Type();

export class Int32Type extends SignedIntegerType {
    readonly name = "Int32";
    coerce(val: unknown): number | null { return toValidInt(val, "Int32"); }
    equals(other: DataType): boolean { return other.name === "Int32"; }
    allocate(size: number): Int32Array { return new Int32Array(size); }
}
export const Int32 = new Int32Type();

export class Int64Type extends SignedIntegerType<bigint | null> {
    readonly name = "Int64";
    coerce(val: unknown): bigint | null { return toValidBigInt(val); }
    equals(other: DataType): boolean { return other.name === "Int64"; }
    allocate(size: number): BigInt64Array { return new BigInt64Array(size); }
}
export const Int64 = new Int64Type();

export class UInt8Type extends UnsignedIntegerType {
    readonly name = "UInt8";
    coerce(val: unknown): number | null { return toValidInt(val, "UInt8"); }
    equals(other: DataType): boolean { return other.name === "UInt8"; }
    allocate(size: number): Uint8Array { return new Uint8Array(size); }
}
export const UInt8 = new UInt8Type();

export class UInt16Type extends UnsignedIntegerType {
    readonly name = "UInt16";
    coerce(val: unknown): number | null { return toValidInt(val, "UInt16"); }
    equals(other: DataType): boolean { return other.name === "UInt16"; }
    allocate(size: number): Uint16Array { return new Uint16Array(size); }
}
export const UInt16 = new UInt16Type();

export class UInt32Type extends UnsignedIntegerType {
    readonly name = "UInt32";
    coerce(val: unknown): number | null { return toValidInt(val, "UInt32"); }
    equals(other: DataType): boolean { return other.name === "UInt32"; }
    allocate(size: number): Uint32Array { return new Uint32Array(size); }
}
export const UInt32 = new UInt32Type();

export class UInt64Type extends UnsignedIntegerType<bigint | null> {
    readonly name = "UInt64";
    coerce(val: unknown): bigint | null { return toValidBigInt(val, "UInt64"); }
    equals(other: DataType): boolean { return other.name === "UInt64"; }
    allocate(size: number): BigUint64Array { return new BigUint64Array(size); }
}
export const UInt64 = new UInt64Type();

export class Float32Type extends FloatDataType {
    readonly name = "Float32";
    coerce(val: unknown): number | null { return toValidFloat(val, { precision: "Float32" }); }
    equals(other: DataType): boolean { return other.name === "Float32"; }
    allocate(size: number): Float32Array { return new Float32Array(size); }
}
export const Float32 = new Float32Type();

export class Float64Type extends FloatDataType {
    readonly name = "Float64";
    coerce(val: unknown): number | null { return toValidFloat(val, { precision: "Float64" }); }
    equals(other: DataType): boolean { return other.name === "Float64"; }
    allocate(size: number): Float64Array { return new Float64Array(size); }
}
export const Float64 = new Float64Type();

export class DecimalType extends NumericDataType {
    readonly name: string;
    constructor(public readonly precision?: number, public readonly scale?: number) {
        super();
        this.name = precision !== undefined && scale !== undefined
            ? `Decimal(${precision}, ${scale})`
            : "Decimal";
    }
    coerce(val: unknown): number | null {
        return toValidDecimal(val, { precision: this.precision, scale: this.scale });
    }
    equals(other: DataType): boolean {
        return other instanceof DecimalType &&
            this.precision === other.precision &&
            this.scale === other.scale;
    }
    allocate(size: number): (number | null)[] { return new Array(size).fill(null); }
}

// ============================================================================
// Standard Types
// ============================================================================

export class BooleanType extends DataType<boolean | null> {
    readonly name = "Boolean";
    override get isBoolean(): boolean { return true; }
    coerce(val: unknown): boolean | null {
        if (val == null) return null;
        return !!val;
    }
    equals(other: DataType): boolean { return other.name === "Boolean"; }
    allocate(size: number): (boolean | null)[] { return new Array(size).fill(null); }
}
export const Boolean = new BooleanType();

export class Utf8Type extends DataType<string | null> {
    readonly name = "Utf8";
    override get isString(): boolean { return true; }
    override get isUtf8(): boolean { return true; }
    coerce(val: unknown): string | null {
        if (val == null) return null;
        return String(val);
    }
    equals(other: DataType): boolean { return other.name === "Utf8"; }
    allocate(size: number): (string | null)[] { return new Array(size).fill(null); }
}
export const Utf8 = new Utf8Type();

export class BinaryType extends DataType<Uint8Array | null> {
    readonly name = "Binary";
    override get isBinary(): boolean { return true; }
    coerce(val: unknown): Uint8Array | null { return toValidBinary(val); }
    equals(other: DataType): boolean { return other.name === "Binary"; }
    allocate(size: number): (Uint8Array | null)[] { return new Array(size).fill(null); }
}
export const Binary = new BinaryType();

export class NullType extends DataType<null> {
    readonly name = "Null";
    override get isNull(): boolean { return true; }
    coerce(_val: unknown): null { return null; }
    equals(other: DataType): boolean { return other.name === "Null"; }
    allocate(size: number): null[] { return new Array(size).fill(null); }
}
export const Null = new NullType();

export class ObjectType extends DataType {
    readonly name = "Object";
    override get isObject(): boolean { return true; }
    coerce(val: unknown): any { return val === undefined ? null : val; }
    equals(other: DataType): boolean { return other.name === "Object"; }
    allocate(size: number): any[] { return new Array(size).fill(null); }
}
export const Object = new ObjectType();

// ============================================================================
// Temporal Types
// ============================================================================

export class DateType extends TemporalDataType<Date | null> {
    readonly name = "Date";
    coerce(val: unknown): Date | null {
        const d = toValidDate(val);
        if (!d) return null;
        d.setUTCHours(0, 0, 0, 0);
        return d;
    }
    equals(other: DataType): boolean { return other.name === "Date"; }
    allocate(size: number): (Date | null)[] { return new Array(size).fill(null); }
}
export const Date = new DateType();

export class DatetimeType extends TemporalDataType<Date | null> {
    readonly name = "Datetime";
    coerce(val: unknown): Date | null { return toValidDate(val); }
    equals(other: DataType): boolean { return other.name === "Datetime"; }
    allocate(size: number): (Date | null)[] { return new Array(size).fill(null); }
}
export const Datetime = new DatetimeType();

export class TimeType extends TemporalDataType<string | null> {
    readonly name = "Time";
    coerce(val: unknown): string | null {
        if (val == null) return null;
        if (typeof val === "string") {
            const trimmed = val.trim();
            if (TIME_PREFIX_REGEX.test(trimmed)) {
                const d = new globalThis.Date(`1970-01-01T${trimmed}${ZONE_OFFSET_REGEX.test(trimmed) ? "" : "Z"}`);
                if (isValidDateObj(d)) {
                    return d.toISOString().split("T")[1].slice(0, 12);
                }
            }
        }
        const d = toValidDate(val);
        return d ? d.toISOString().split("T")[1].slice(0, 12) : null;
    }
    equals(other: DataType): boolean { return other.name === "Time"; }
    allocate(size: number): (string | null)[] { return new Array(size).fill(null); }
}
export const Time = new TimeType();

export class DurationType extends TemporalDataType<number | null> {
    readonly name = "Duration";
    coerce(val: unknown): number | null { return toValidNumber(val); }
    equals(other: DataType): boolean { return other.name === "Duration"; }
    allocate(size: number): (number | null)[] { return new Array(size).fill(null); }
}
export const Duration = new DurationType();

// ============================================================================
// Nested Types
// ============================================================================

export class ListType<TInner = any> extends NestedDataType<TInner[] | null> {
    readonly name = "List";
    constructor(public readonly innerType: RegisteredDataType & DataType<TInner>) { super(); }
    coerce(val: unknown): TInner[] | null {
        if (val == null) return null;
        const arr = isArrayOrTypedArray(val) ? Array.from(val as any) : [val];
        const len = arr.length;
        const res = new Array(len);
        for (let i = 0; i < len; i++) {
            res[i] = this.innerType.coerce(arr[i]);
        }
        return res;
    }
    equals(other: DataType): boolean {
        return other instanceof ListType && this.innerType.equals(other.innerType);
    }
    allocate(size: number): (TInner[] | null)[] { return new Array(size).fill(null); }
}
export const List = <TInner>(inner: RegisteredDataType & DataType<TInner>) => new ListType<TInner>(inner);

export class StructType<TFields extends RowRecord = any> extends NestedDataType<TFields | null> {
    readonly name = "Struct";
    constructor(public readonly fields: { [K in keyof TFields]: RegisteredDataType & DataType<TFields[K]> }) { super(); }
    coerce(val: unknown): TFields | null {
        if (!isObj(val)) return null;
        const res: any = {};
        const keys = globalThis.Object.keys(this.fields);
        const len = keys.length;
        for (let i = 0; i < len; i++) {
            const k = keys[i];
            const type = this.fields[k];
            res[k] = type.coerce((val as any)[k]);
        }
        return res;
    }
    equals(other: DataType): boolean {
        if (!(other instanceof StructType)) return false;
        const keysThis = globalThis.Object.keys(this.fields);
        const keysOther = globalThis.Object.keys(other.fields);
        if (keysThis.length !== keysOther.length) return false;
        for (const k of keysThis) {
            if (!other.fields[k] || !this.fields[k].equals(other.fields[k])) return false;
        }
        return true;
    }
    allocate(size: number): (TFields | null)[] { return new Array(size).fill(null); }
}
export const Struct = <TFields extends RowRecord>(fields: { [K in keyof TFields]: RegisteredDataType & DataType<TFields[K]> }) => new StructType<TFields>(fields);

export type RegisteredDataType =
    | Int8Type | Int16Type | Int32Type | Int64Type
    | UInt8Type | UInt16Type | UInt32Type | UInt64Type
    | Float32Type | Float64Type | DecimalType
    | BooleanType | Utf8Type | BinaryType | NullType | ObjectType
    | DateType | DatetimeType | TimeType | DurationType
    | ListType<any> | StructType<any>;
