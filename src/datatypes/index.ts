import {
    DataType as BaseDataType,
    NumericDataType,
    IntegerDataType,
    SignedIntegerType,
    UnsignedIntegerType,
    FloatDataType,
    TemporalDataType,
    NestedDataType
} from "./dataType";
import {
    Int8,
    Int16,
    Int32,
    Int64,
    UInt8,
    UInt16,
    UInt32,
    UInt64,
    Float32,
    Float64,
    DecimalType,
    BooleanDataType as Boolean,
    Utf8,
    Binary,
    DateDataType as Date,
    Datetime,
    Time,
    Duration,
    ObjectDataType as Object,
    Null,
    ArrayDataType as Array,
    Struct
} from "./types";

export { BaseDataType as DataType };
export { Boolean, Date, Object, Array };
export * from "./types";
export * from "./dataType";

export const DataTypeRegistry = {
    Int8,
    Int16,
    Int32,
    Int64,
    UInt8,
    UInt16,
    UInt32,
    UInt64,
    Float32,
    Float64,
    Decimal: (precision?: number, scale?: number) => new DecimalType(precision, scale),
    Boolean,
    Utf8,
    Binary,
    Date,
    Datetime,
    Time,
    Duration,
    Object,
    Null,
    Array,
    Struct,
    Numeric: NumericDataType,
    Integer: IntegerDataType,
    SignedInteger: SignedIntegerType,
    UnsignedInteger: UnsignedIntegerType,
    Float: FloatDataType,
    Temporal: TemporalDataType,
    Nested: NestedDataType
};
