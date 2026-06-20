import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src/api";

console.log("=========================================");
console.log("STARTING POLARS DATATYPES TESTS...");
console.log("=========================================");

// 1. Test Metadata Classification Getters
const tInt8 = $df.DataType.Int8;
const tUInt32 = $df.DataType.UInt32;
const tInt64 = $df.DataType.Int64;
const tFloat32 = $df.DataType.Float32;
const tDecimal = $df.DataType.Decimal(10, 2);
const tDate = $df.DataType.Date;
const tArray = $df.DataType.Array($df.DataType.Int32);

if (!tInt8.isNumeric || !tInt8.isInteger || !tInt8.isSigned || tInt8.isUnsigned) {
    throw new Error("Int8 metadata classification failed");
}
if (!tUInt32.isNumeric || !tUInt32.isInteger || tUInt32.isSigned || !tUInt32.isUnsigned) {
    throw new Error("UInt32 metadata classification failed");
}
if (!tInt64.isNumeric || !tInt64.isInteger || !tInt64.isSigned) {
    throw new Error("Int64 metadata classification failed");
}
if (!tFloat32.isNumeric || tFloat32.isInteger || !tFloat32.isFloat) {
    throw new Error("Float32 metadata classification failed");
}
if (!tDecimal.isNumeric || tDecimal.isInteger || tDecimal.isFloat) {
    throw new Error("Decimal metadata classification failed");
}
if (!tDate.isTemporal) {
    throw new Error("Date isTemporal metadata classification failed");
}
if (!tArray.isNested) {
    throw new Error("Array isNested metadata classification failed");
}

// Check new getters
if (!$df.DataType.Null.isNull) {
    throw new Error("Null isNull check failed");
}
if (!$df.DataType.Object.isObject) {
    throw new Error("Object isObject check failed");
}
if (!$df.DataType.Boolean.isBoolean) {
    throw new Error("Boolean isBoolean check failed");
}
if (!$df.DataType.Utf8.isString || !$df.DataType.Utf8.isUtf8) {
    throw new Error("Utf8 isString/isUtf8 check failed");
}
if (!$df.DataType.Binary.isBinary) {
    throw new Error("Binary isBinary check failed");
}

// 2. Test Intake Coercion in DataFrame
const data = [
    {
        val_i8: 200,          // should clamp to 127
        val_u8: -10,          // should clamp to 0
        val_i64: "123456789012345", // should coerce to BigInt
        val_u64: 9876543210n, // should keep as BigInt
        val_f32: 0.1 + 0.2,   // should round single precision
        val_dec: 10.3456,     // should round to 10.35 (scale 2)
        val_date: "2026-05-25T10:37:16Z", // should truncate to 2026-05-25T00:00:00Z
        val_time: "2026-05-25T10:37:16.123Z", // should format to "10:37:16.123"
        val_duration: 5000,   // should remain 5000
        val_binary: "hello",  // should coerce to Uint8Array UTF-8 bytes
        val_obj: { x: 1 },    // should remain object
        val_null: 42          // should coerce to null
    }
];

const schema = {
    val_i8: $df.DataType.Int8,
    val_u8: $df.DataType.UInt8,
    val_i64: $df.DataType.Int64,
    val_u64: $df.DataType.UInt64,
    val_f32: $df.DataType.Float32,
    val_dec: $df.DataType.Decimal(10, 2),
    val_date: $df.DataType.Date,
    val_time: $df.DataType.Time,
    val_duration: $df.DataType.Duration,
    val_binary: $df.DataType.Binary,
    val_obj: $df.DataType.Object,
    val_null: $df.DataType.Null
};

const df = new DataFrame(data, schema);
const collected = df.to_dicts() as any[];
const row = collected[0];

console.log("Coerced row data:");
console.dir(row, { depth: null });

// Assertions
if (row.val_i8 !== 127) throw new Error(`Expected val_i8 to be 127, got ${row.val_i8}`);
if (row.val_u8 !== 0) throw new Error(`Expected val_u8 to be 0, got ${row.val_u8}`);
if (row.val_i64 !== 123456789012345n) throw new Error(`Expected val_i64 to be 123456789012345n, got ${row.val_i64}`);
if (row.val_u64 !== 9876543210n) throw new Error(`Expected val_u64 to be 9876543210n, got ${row.val_u64}`);
if (row.val_f32 !== Math.fround(0.1 + 0.2)) throw new Error(`Expected val_f32 to be single-precision, got ${row.val_f32}`);
if (row.val_dec !== 10.35) throw new Error(`Expected val_dec to be 10.35, got ${row.val_dec}`);

if (!(row.val_date instanceof Date) || row.val_date.getUTCHours() !== 0 || row.val_date.getUTCDate() !== 25) {
    throw new Error(`Expected val_date to be midnight UTC on 2026-05-25, got ${row.val_date}`);
}

if (row.val_time !== "10:37:16.123") throw new Error(`Expected val_time to be 10:37:16.123, got ${row.val_time}`);
if (row.val_duration !== 5000) throw new Error(`Expected val_duration to be 5000, got ${row.val_duration}`);

if (!(row.val_binary instanceof Uint8Array) || row.val_binary[0] !== 104) { // 'h' is ASCII 104
    throw new Error(`Expected val_binary to be Uint8Array of 'hello', got ${row.val_binary}`);
}

if (row.val_obj.x !== 1) throw new Error(`Expected val_obj to preserve properties, got ${row.val_obj}`);
if (row.val_null !== null) throw new Error(`Expected val_null to be null, got ${row.val_null}`);

console.log("✓ All Polars DataType tests passed!");
