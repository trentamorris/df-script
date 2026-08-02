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
if (dictNeg[0].sub_10s !== 90000) throw new Error("Sub duration failed");

console.log("=========================================");
console.log("🎉 ALL EXTENSIVE DURATION EXAMPLES & TESTS PASSED!");
console.log("=========================================");
