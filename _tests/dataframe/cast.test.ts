declare const process: any;
import { DataFrame, $df } from "df-script";

console.log("Running DataFrame.cast tests...");

// 1. Cast all columns to Float64 ($df.Float64)
const df1 = new DataFrame({
    a: [1, 2, 3],
    b: [4, 5, 6]
});

const res1 = df1.cast($df.Float64);
if (res1.schema.a !== $df.Float64 || res1.schema.b !== $df.Float64) {
    throw new Error("Cast all columns to Float64 failed schema check");
}
const dicts1 = res1.toDicts();
if (dicts1[0].a !== 1.0 || dicts1[2].b !== 6.0) {
    throw new Error("Cast all columns to Float64 failed values check");
}

// 2. Cast specific columns via object mapping ({ id: $df.UInt32, score: $df.Float32 })
const df2 = new DataFrame({
    id: [1, 2, 3],
    score: ["10.5", "20.0", "30.5"],
    name: ["Alice", "Bob", "Charlie"]
});

const res2 = df2.cast({
    id: $df.UInt32,
    score: $df.Float32
});

if (res2.schema.id !== $df.UInt32 || res2.schema.score !== $df.Float32 || res2.schema.name !== $df.Utf8) {
    throw new Error("Cast mapped columns failed schema check");
}
const dicts2 = res2.toDicts();
if (dicts2[0].id !== 1 || dicts2[0].score !== 10.5 || dicts2[0].name !== "Alice") {
    throw new Error("Cast mapped columns failed values check");
}

// 3. Cast with strict: false (safe cast producing null on failure)
const df3 = new DataFrame({
    num_str: ["1", "two", "3"]
});

const res3 = df3.cast({ num_str: $df.Int64 }, { strict: false });
const dicts3 = res3.toDicts();
if (dicts3[0].num_str !== 1n || dicts3[1].num_str !== null || dicts3[2].num_str !== 3n) {
    throw new Error("Cast with strict: false failed values check: " + JSON.stringify(dicts3));
}

// 4. Cast empty dataframe
const dfEmpty = new DataFrame({});
const resEmpty = dfEmpty.cast($df.Int32);
if (resEmpty.height !== 0) {
    throw new Error("Cast empty dataframe failed");
}

// 6. Integer & unsigned integer widths (Int8, Int16, Int32, Int64, UInt8, UInt16, UInt32, UInt64)
const dfInts = new DataFrame([
    { v: "42" },
    { v: "0" }
]);
const dfIntCast = dfInts.cast({
    v: $df.Int32
});
const rowsInt = dfIntCast.toDicts();
if (rowsInt[0].v !== 42 || rowsInt[1].v !== 0) {
    throw new Error("Int32 cast from string failed");
}

const dfBig = new DataFrame([{ a: "123456789012345", b: "9876543210" }]).cast({
    a: $df.Int64,
    b: $df.UInt64
});
const rowsBig = dfBig.toDicts();
if (rowsBig[0].a !== 123456789012345n || rowsBig[0].b !== 9876543210n) {
    throw new Error("Int64 / UInt64 BigInt cast failed");
}

// 7. Float32 and Float64 precision casting
const dfFloats = new DataFrame([{ f32: "1.5", f64: "3.141592653589793" }]).cast({
    f32: $df.Float32,
    f64: $df.Float64
});
const rowsFloats = dfFloats.toDicts();
if (rowsFloats[0].f32 !== 1.5 || Math.abs(rowsFloats[0].f64 - Math.PI) > 1e-12) {
    throw new Error("Float32 / Float64 cast failed");
}

// 8. Boolean casting from numbers
const dfBool = new DataFrame([
    { n: 1 },
    { n: 0 }
]).cast({
    n: $df.Boolean
});
const rowsBool = dfBool.toDicts();
if (rowsBool[0].n !== true || rowsBool[1].n !== false) {
    throw new Error("Boolean cast failed");
}

// 9. Temporal types: Date, Datetime, Time, Duration
const dfTemp = new DataFrame([
    { d: "2026-05-25", dt: "2026-05-25T10:30:00.000Z", t: "10:30:00", dur: 5000 }
]).cast({
    d: $df.Date,
    dt: $df.Datetime,
    t: $df.Time,
    dur: $df.Duration
});
const rowsTemp = dfTemp.toDicts();
if (!(rowsTemp[0].d instanceof Date) || !(rowsTemp[0].dt instanceof Date)) {
    throw new Error("Date / Datetime cast did not produce Date instances");
}
if (rowsTemp[0].dur !== 5000) {
    throw new Error(`Duration cast failed: ${rowsTemp[0].dur}`);
}

// 10. Binary and Null DataTypes
const dfBinNull = new DataFrame([{ b: "hello", n: 123 }]).cast({
    b: $df.Binary,
    n: $df.Null
});
const rowsBinNull = dfBinNull.toDicts();
if (!(rowsBinNull[0].b instanceof Uint8Array) || rowsBinNull[0].b.length !== 5) {
    throw new Error("Binary cast failed");
}
if (rowsBinNull[0].n !== null) {
    throw new Error("Null cast did not produce null");
}

// 11. Null preservation across casts
const dfNulls = new DataFrame([{ a: "10" }, { a: null }]).cast({ a: $df.Int32 });
const rowsNulls = dfNulls.toDicts();
if (rowsNulls[0].a !== 10 || rowsNulls[1].a !== null) {
    throw new Error("Null preservation during cast failed");
}

// 12. Non-strict cast (strict: false) turns invalid values into null
const dfNonStrict = new DataFrame([{ a: "123" }, { a: "not_a_number" }]).cast(
    { a: $df.Int32 },
    { strict: false }
);
const rowsNonStrict = dfNonStrict.toDicts();
if (rowsNonStrict[0].a !== 123 || rowsNonStrict[1].a !== null) {
    throw new Error("Non-strict cast should coerce invalid values to null");
}

// 13. Empty DataFrame (height === 0) returns cleanly without throwing
const dfEmpty2 = new DataFrame({ a: [] as string[], b: [] as number[] });
const dfEmptyCast2 = dfEmpty2.cast({ a: $df.Int32 });
if (dfEmptyCast2.height !== 0 || dfEmptyCast2.width !== 2) {
    throw new Error("Empty DataFrame cast failed");
}

// 14. Invalid cast target throws InvalidArgumentError
let threwInvalid = false;
try {
    dfInts.cast("invalid" as any);
} catch (e: any) {
    if (e.message.includes("Invalid cast target")) {
        threwInvalid = true;
    }
}
if (!threwInvalid) {
    throw new Error("Expected Invalid cast target error was not thrown");
}

// 15. All signed & unsigned integer boundary widths
const dfBounds = new DataFrame([
    { i8: -128, i16: -32768, u8: 0, u16: 0, u32: 0 },
    { i8: 127, i16: 32767, u8: 255, u16: 65535, u32: 4294967295 }
]).cast({
    i8: $df.Int8,
    i16: $df.Int16,
    u8: $df.UInt8,
    u16: $df.UInt16,
    u32: $df.UInt32
});
const rowsBounds = dfBounds.toDicts();
if (
    rowsBounds[0].i8 !== -128 || rowsBounds[1].i8 !== 127 ||
    rowsBounds[0].i16 !== -32768 || rowsBounds[1].i16 !== 32767 ||
    rowsBounds[0].u8 !== 0 || rowsBounds[1].u8 !== 255 ||
    rowsBounds[0].u16 !== 0 || rowsBounds[1].u16 !== 65535 ||
    rowsBounds[0].u32 !== 0 || rowsBounds[1].u32 !== 4294967295
) {
    throw new Error("Signed/unsigned integer boundary cast failed");
}

// 16. BigInt negative, max UInt64, and Int64 -> Utf8 -> Int64 round-trip
const dfBigEdge = new DataFrame([
    { neg: "-1234567890123456789", maxU64: "18446744073709551615" }
]).cast({
    neg: $df.Int64,
    maxU64: $df.UInt64
});
const rowsBigEdge = dfBigEdge.toDicts();
if (rowsBigEdge[0].neg !== -1234567890123456789n || rowsBigEdge[0].maxU64 !== 18446744073709551615n) {
    throw new Error("BigInt negative / max UInt64 cast failed");
}
const dfBigRoundTrip = dfBigEdge.cast({ neg: $df.Utf8 }).cast({ neg: $df.Int64 });
if (dfBigRoundTrip.toDicts()[0].neg !== -1234567890123456789n) {
    throw new Error("Int64 -> Utf8 -> Int64 round-trip failed");
}

// 17. Float special values (NaN, Infinity, -Infinity, scientific notation)
const dfFloatSpecial = new DataFrame([
    { f: "1.25e-4" },
    { f: "Infinity" },
    { f: "-Infinity" },
    { f: "NaN" }
]).cast({ f: $df.Float64 });
const rowsFloatSpecial = dfFloatSpecial.toDicts();
if (
    Math.abs(rowsFloatSpecial[0].f - 0.000125) > 1e-12 ||
    rowsFloatSpecial[1].f !== Infinity ||
    rowsFloatSpecial[2].f !== -Infinity ||
    !Number.isNaN(rowsFloatSpecial[3].f)
) {
    throw new Error("Float64 special values cast failed");
}

// 18. Temporal round-trips: Date -> Int64 (epoch ms) -> Datetime, and Duration edge values
const epochMs = Date.UTC(2026, 4, 25, 12, 0, 0);
const dfTempRound = new DataFrame([{ dt: new Date(epochMs), dur: -1500 }])
    .cast({ dt: $df.Int64, dur: $df.Duration });
const rowsTempRound = dfTempRound.toDicts();
if (rowsTempRound[0].dt !== BigInt(epochMs) || rowsTempRound[0].dur !== -1500) {
    throw new Error("Temporal Date -> Int64 / negative Duration cast failed");
}
const dfBackToDt = dfTempRound.cast({ dt: $df.Datetime });
if (!(dfBackToDt.toDicts()[0].dt instanceof Date) || dfBackToDt.toDicts()[0].dt.getTime() !== epochMs) {
    throw new Error("Int64 -> Datetime round-trip failed");
}

console.log("DataFrame.cast tests passed!");
