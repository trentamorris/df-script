declare const process: any;
import { $df } from "../../../src/index";

console.log("Running ExprBase.cast edge-case tests...");

// 1. Cast integer to Utf8 string
const df = $df.data({ a: [1, 2, 3] });
const res1 = df.select([
    $df.col("a").cast($df.Utf8).alias("str_a")
]).toDicts() as any[];

if (res1[0].str_a !== "1" || res1[1].str_a !== "2" || res1[2].str_a !== "3") {
    throw new Error("1. cast to Utf8 failed");
}

// 2. Cast string to Float64
const dfStr = $df.data({ s: ["10.5", "20.25", "30.75"] });
const resFloat = dfStr.select([
    $df.col("s").cast($df.Float64).alias("num")
]).toDicts() as any[];

if (resFloat[0].num !== 10.5 || resFloat[1].num !== 20.25 || resFloat[2].num !== 30.75) {
    throw new Error("2. cast to Float64 failed");
}

// 3. Cast to Boolean
const dfBool = $df.data({ num: [1, 0, 42, 0], str: ["true", "false", "yes", ""] });
const resBool = dfBool.select([
    $df.col("num").cast($df.Boolean).alias("b_num"),
    $df.col("str").cast($df.Boolean).alias("b_str")
]).toDicts() as any[];

if (resBool[0].b_num !== true || resBool[1].b_num !== false || resBool[2].b_num !== true) {
    throw new Error("3. cast to Boolean numeric failed");
}

// 4. Null & Undefined propagation in cast
const dfNulls = $df.data({ v: [10, null, undefined, 40] });
const resNulls = dfNulls.select([
    $df.col("v").cast($df.Utf8).alias("casted")
]).toDicts() as any[];

if (resNulls[0].casted !== "10" || resNulls[1].casted !== null || resNulls[2].casted !== null || resNulls[3].casted !== "40") {
    throw new Error("4. null/undefined cast preservation failed");
}

// 5. Non-strict mode: invalid conversions coerce to null without throwing
const dfInvalid = $df.data({ s: ["valid", "abc", "123"] });
const resNonStrict = dfInvalid.select([
    $df.col("s").cast($df.Int32, { strict: false }).alias("int_val")
]).toDicts() as any[];

if (resNonStrict[0].int_val !== null || resNonStrict[1].int_val !== null || resNonStrict[2].int_val !== 123) {
    throw new Error("5. non-strict cast should produce null on unparseable values and parse valid ones");
}

// 6. Strict mode result (default options: { strict: true })
const resStrictDefault = dfInvalid.select([
    $df.col("s").cast($df.Int32).alias("strict_int")
]).toDicts() as any[];

if (resStrictDefault[0].strict_int !== null || resStrictDefault[1].strict_int !== null || resStrictDefault[2].strict_int !== 123) {
    throw new Error("6. default strict cast mismatch");
}

// 7. Empty DataFrame casting
const emptyDf = $df.data({ a: [] as number[] });
const resEmpty = emptyDf.select([
    $df.col("a").cast($df.Utf8).alias("empty_str")
]).toDicts() as any[];

if (resEmpty.length !== 0) {
    throw new Error("7. empty DataFrame cast must return empty array");
}

// 8. Chained cast: Int -> Utf8 -> Int
const dfRoundTrip = $df.data({ n: [42, 999] });
const resRoundTrip = dfRoundTrip.select([
    $df.col("n").cast($df.Utf8).cast($df.Int32).alias("roundtrip")
]).toDicts() as any[];

if (resRoundTrip[0].roundtrip !== 42 || resRoundTrip[1].roundtrip !== 999) {
    throw new Error("8. round-trip cast failed");
}

// 9. Cast on Date/Datetime values
const now = new Date("2026-01-01T00:00:00.000Z");
const dfDate = $df.data({ d: [now] });
const resDate = dfDate.select([
    $df.col("d").cast($df.Int64).alias("ts")
]).toDicts() as any[];

if (typeof resDate[0].ts !== "bigint" && typeof resDate[0].ts !== "number") {
    throw new Error("9. Date cast failed");
}

console.log("✓ StandardExpr.cast tests passed! (9 edge cases)");
