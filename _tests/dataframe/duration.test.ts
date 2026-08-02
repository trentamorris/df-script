import { $df } from "../../src/api";

console.log("=========================================");
console.log("STARTING EXTENSIVE DURATION EXAMPLES & TESTS...");
console.log("=========================================");

// ----------------------------------------------------------------------------
// 1. Single Unit Duration Constructors
// ----------------------------------------------------------------------------
const dfUnits = $df.data({
    val: [1, 2, 3]
});

const resUnits = dfUnits.select([
    $df.duration({ weeks: 1 }).alias("1_week"),
    $df.duration({ days: 2 }).alias("2_days"),
    $df.duration({ hours: 5 }).alias("5_hours"),
    $df.duration({ minutes: 30 }).alias("30_mins"),
    $df.duration({ seconds: 45 }).alias("45_secs"),
    $df.duration({ milliseconds: 500 }).alias("500_ms"),
    $df.duration({ microseconds: 1000 }).alias("1000_us"),
    $df.duration({ nanoseconds: 1000000 }).alias("1m_ns"),
]);

const dictUnits = resUnits.to_dicts()[0];
console.log("Single Unit Constructor Outputs (ms):", dictUnits);

if (dictUnits["1_week"] !== 604800000) throw new Error("1 week failed");
if (dictUnits["2_days"] !== 172800000) throw new Error("2 days failed");
if (dictUnits["5_hours"] !== 18000000) throw new Error("5 hours failed");
if (dictUnits["30_mins"] !== 1800000) throw new Error("30 mins failed");
if (dictUnits["45_secs"] !== 45000) throw new Error("45 secs failed");
if (dictUnits["500_ms"] !== 500) throw new Error("500 ms failed");
if (dictUnits["1000_us"] !== 1) throw new Error("1000 us failed");
if (dictUnits["1m_ns"] !== 1) throw new Error("1m ns failed");

// ----------------------------------------------------------------------------
// 2. Multi-Unit Combined Durations (Composite Duration)
// ----------------------------------------------------------------------------
const dfComposite = $df.data({ id: [1] });
const resComposite = dfComposite.select([
    $df.duration({ days: 1, hours: 2, minutes: 30, seconds: 15 }).alias("combo_ms"),
]);
const dictComposite = resComposite.to_dicts()[0];
console.log("Composite Duration (1d 2h 30m 15s):", dictComposite.combo_ms);

// 1d (86400000) + 2h (7200000) + 30m (1800000) + 15s (15000) = 95415000 ms
if (dictComposite.combo_ms !== 95415000) {
    throw new Error(`Expected 95415000 ms, got ${dictComposite.combo_ms}`);
}

// ----------------------------------------------------------------------------
// 3. Time Unit Precision Scaling ("ms", "us", "ns")
// ----------------------------------------------------------------------------
const dfPrec = $df.data({ id: [1] });
const resPrec = dfPrec.select([
    $df.duration({ seconds: 1, timeUnit: "ms" }).alias("dur_ms"),
    $df.duration({ seconds: 1, timeUnit: "us" }).alias("dur_us"),
    $df.duration({ seconds: 1, timeUnit: "ns" }).alias("dur_ns"),
]);

const dictPrec = resPrec.to_dicts()[0];
console.log("TimeUnit Precisions for 1 second:", dictPrec);

if (dictPrec.dur_ms !== 1000) throw new Error("MS precision failed");
if (dictPrec.dur_us !== 1000000) throw new Error("US precision failed");
if (dictPrec.dur_ns !== 1000000000) throw new Error("NS precision failed");

// ----------------------------------------------------------------------------
// 4. Row-Dynamic Durations using Column Names and Column Expressions
// ----------------------------------------------------------------------------
const dfDynamic = $df.data({
    d: [1, 2, 3],
    h: [10, 20, 30],
});

const resDynamic = dfDynamic.select([
    $df.duration({ days: "d" }).alias("dyn_days"),
    $df.duration({ hours: $df.col("h") }).alias("dyn_hours"),
    $df.duration({ days: "d", hours: "h" }).alias("dyn_combo"),
]);

const dictDynamic = resDynamic.to_dicts();
console.log("Dynamic Column Duration Results:", dictDynamic);

if (dictDynamic[0].dyn_days !== 86400000) throw new Error("Dynamic row 0 days failed");
if (dictDynamic[1].dyn_days !== 172800000) throw new Error("Dynamic row 1 days failed");
if (dictDynamic[2].dyn_hours !== 108000000) throw new Error("Dynamic row 2 hours failed");
// Row 0: 1d (86400000) + 10h (36000000) = 122400000 ms
if (dictDynamic[0].dyn_combo !== 122400000) throw new Error("Dynamic row 0 combo failed");

// ----------------------------------------------------------------------------
// 5. Negative Durations & Arithmetic Math
// ----------------------------------------------------------------------------
const dfNeg = $df.data({
    val: [100000, 200000]
});

const resNeg = dfNeg.select([
    $df.duration({ hours: -1 }).alias("neg_hour"),
    $df.col("val").add($df.duration({ seconds: 10 })).alias("add_10s"),
    $df.col("val").sub($df.duration({ seconds: 10 })).alias("sub_10s"),
]);

const dictNeg = resNeg.to_dicts();
console.log("Negative & Expression Arithmetic Results:", dictNeg);

if (dictNeg[0].neg_hour !== -3600000) throw new Error("Negative duration failed");
if (dictNeg[0].add_10s !== 110000) throw new Error("Add duration failed");
if (dictNeg[0].neg_hour !== -3600000) throw new Error("Negative duration failed");
if (dictNeg[0].add_10s !== 110000) throw new Error("Add duration failed");
if (dictNeg[0].sub_10s !== 90000) throw new Error("Sub duration failed");

// ----------------------------------------------------------------------------
// 6. .dt.offset_day() Edge Case Tests
// ----------------------------------------------------------------------------
const dfOffsetDay = $df.data({
    dt: ["2026-05-20", "2026-05-20", null],
    shift: [5, -2, 10]
});

const resOffsetDay = dfOffsetDay.select([
    $df.col("dt").cast($df.DataType.Datetime).dt.offset_day(5).alias("pos_const"),
    $df.col("dt").cast($df.DataType.Datetime).dt.offset_day(-2).alias("neg_const"),
    $df.col("dt").cast($df.DataType.Datetime).dt.offset_day($df.col("shift")).alias("dyn_col"),
]);

const dictOffsetDay = resOffsetDay.to_dicts();
console.log(".dt.offset_day() Results:", dictOffsetDay);

const toISO = (val: any) => val instanceof Date ? val.toISOString() : (val != null ? new Date(val).toISOString() : null);

if (toISO(dictOffsetDay[0].pos_const) !== "2026-05-25T00:00:00.000Z") throw new Error("Positive offset_day failed");
if (toISO(dictOffsetDay[0].neg_const) !== "2026-05-18T00:00:00.000Z") throw new Error("Negative offset_day failed");
if (toISO(dictOffsetDay[0].dyn_col) !== "2026-05-25T00:00:00.000Z") throw new Error("Dynamic offset_day row 0 failed");
if (toISO(dictOffsetDay[1].dyn_col) !== "2026-05-18T00:00:00.000Z") throw new Error("Dynamic offset_day row 1 failed");
if (dictOffsetDay[2].dyn_col !== null) throw new Error("Null offset_day should return null");

// ----------------------------------------------------------------------------
// 7. Edge Cases: Empty Options, Booleans, Null Propagation & Array Mismatches
// ----------------------------------------------------------------------------
// Edge Case 7a: Empty options error handling
let emptyOptionsErrorThrown = false;
try {
    $df.duration({});
} catch (e) {
    emptyOptionsErrorThrown = true;
}
if (!emptyOptionsErrorThrown) throw new Error("Empty $df.duration({}) should throw InvalidArgumentError");

// Edge Case 7b: Boolean coercion (true = 1, false = 0)
const dfBool = $df.data({ flag: [true, false] });
const resBool = dfBool.select([
    $df.duration({ days: $df.col("flag") }).alias("bool_days")
]).to_dicts();
if (resBool[0].bool_days !== 86400000) throw new Error("Boolean true in duration failed");
if (resBool[1].bool_days !== 0) throw new Error("Boolean false in duration failed");

// Edge Case 7c: Null propagation in multi-component duration
const dfMultiNull = $df.data({ days_val: [5, null] });
const resMultiNull = dfMultiNull.select([
    $df.duration({ weeks: 1, days: $df.col("days_val") }).alias("multi_null")
]).to_dicts();
if (resMultiNull[0].multi_null !== 604800000 + 432000000) throw new Error("Multi-component duration row 0 failed");
if (resMultiNull[1].multi_null !== null) throw new Error("Multi-component duration null row 1 failed");

console.log("=========================================");
console.log("🎉 ALL DURATION & TEMPORAL TESTS PASSED!");
console.log("=========================================");

