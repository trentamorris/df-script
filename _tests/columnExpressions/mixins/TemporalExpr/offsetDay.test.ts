declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.offsetDay tests...");

const getISOStr = (val: any) => (val instanceof Date ? val : new Date(val)).toISOString().split("T")[0];
const getFullISO = (val: any) => (val instanceof Date ? val : new Date(val)).toISOString();

// 1. Basic scalar, column, and business day offsets
const df = $df.data([
    { date: "2026-05-21", offset: 3 }, // Thursday
    { date: "2026-05-22", offset: 1 }, // Friday
    { date: "2026-05-20", offset: 0 },
    { date: "2026-05-20", offset: -3 },
    { date: null, offset: 2 },
    { date: "2026-05-20", offset: null }
], { date: $df.Date, offset: $df.Int32 });

const res = df.select([
    $df.col("date").dt.offsetDay(3).alias("add_scalar"),
    $df.col("date").dt.offsetDay($df.col("offset")).alias("add_col"),
    $df.col("date").dt.offsetDay($df.col("offset"), { excludeWeekdays: [0, 6] }).alias("biz_offset")
]).toDicts() as any[];

if (getISOStr(res[0].add_scalar) !== "2026-05-24") throw new Error("Thursday + 3 days = 2026-05-24");
if (getISOStr(res[1].biz_offset) !== "2026-05-25") throw new Error("Friday + 1 biz day = 2026-05-25 (Monday)");
if (res[4].add_col !== null || res[5].add_col !== null) throw new Error("Null date or offset should produce null");

// 2. Negative and zero offsets across weekends
const dfNegative = $df.data([
    { date: "2026-05-18", n: -1 }, // Mon - 1 biz day -> Fri 2026-05-15
    { date: "2026-05-18", n: -5 }, // Mon - 5 biz days -> Mon 2026-05-11
    { date: "2026-05-18", n: 0 },  // Mon + 0 biz days -> Mon 2026-05-18
    { date: "2026-05-22", n: -1 }, // Fri - 1 biz day -> Thu 2026-05-21
], { date: $df.Date, n: $df.Int32 });

const resNeg = dfNegative.select([
    $df.col("date").dt.offsetDay($df.col("n"), { excludeWeekdays: [0, 6] }).alias("neg_biz")
]).toDicts() as any[];

if (getISOStr(resNeg[0].neg_biz) !== "2026-05-15") throw new Error(`Mon - 1 biz day failed: ${getISOStr(resNeg[0].neg_biz)}`);
if (getISOStr(resNeg[1].neg_biz) !== "2026-05-11") throw new Error(`Mon - 5 biz days failed: ${getISOStr(resNeg[1].neg_biz)}`);
if (getISOStr(resNeg[2].neg_biz) !== "2026-05-18") throw new Error(`Mon + 0 biz days failed: ${getISOStr(resNeg[2].neg_biz)}`);
if (getISOStr(resNeg[3].neg_biz) !== "2026-05-21") throw new Error(`Fri - 1 biz day failed: ${getISOStr(resNeg[3].neg_biz)}`);

// 3. Holidays & Multi-day Holiday Clusters
const dfHolidays = $df.data([
    { date: "2026-05-18", step: 1 }, // Mon + 1 with Tue holiday -> Wed 2026-05-20
    { date: "2026-05-18", step: 2 }, // Mon + 2 with Tue & Wed holiday -> Thu 2026-05-21
    { date: "2026-05-21", step: -1 } // Thu - 1 with Wed holiday -> Tue 2026-05-19
], { date: $df.Date, step: $df.Int32 });

const resHol = dfHolidays.select([
    $df.col("date").dt.offsetDay($df.col("step"), {
        excludeWeekdays: [0, 6],
        holidays: ["2026-05-19", "2026-05-20"]
    }).alias("hol_offset")
]).toDicts() as any[];

if (getISOStr(resHol[0].hol_offset) !== "2026-05-21") throw new Error(`Skips Tue(19), Wed(20) -> Thu(21), got: ${getISOStr(resHol[0].hol_offset)}`);
if (getISOStr(resHol[1].hol_offset) !== "2026-05-22") throw new Error(`Skips Tue(19), Wed(20) -> Fri(22), got: ${getISOStr(resHol[1].hol_offset)}`);
if (getISOStr(resHol[2].hol_offset) !== "2026-05-18") throw new Error(`Thu - 1 skips Wed(20), Tue(19) -> Mon(18), got: ${getISOStr(resHol[2].hol_offset)}`);

// 4. Weekend Roll options (forward, backward, raise)
const dfWeekend = $df.data([
    { date: "2026-05-23" }, // Saturday
    { date: "2026-05-24" }  // Sunday
], { date: $df.Date });

const resRoll = dfWeekend.select([
    $df.col("date").dt.offsetDay(0, { excludeWeekdays: [0, 6], roll: "forward" }).alias("roll_fwd"),
    $df.col("date").dt.offsetDay(0, { excludeWeekdays: [0, 6], roll: "backward" }).alias("roll_bwd"),
    $df.col("date").dt.offsetDay(1, { excludeWeekdays: [0, 6], roll: "forward" }).alias("fwd_step1"),
    $df.col("date").dt.offsetDay(-1, { excludeWeekdays: [0, 6], roll: "backward" }).alias("bwd_step1")
]).toDicts() as any[];

if (getISOStr(resRoll[0].roll_fwd) !== "2026-05-25") throw new Error("Sat roll forward to Mon failed");
if (getISOStr(resRoll[1].roll_fwd) !== "2026-05-25") throw new Error("Sun roll forward to Mon failed");
if (getISOStr(resRoll[0].roll_bwd) !== "2026-05-22") throw new Error("Sat roll backward to Fri failed");
if (getISOStr(resRoll[1].roll_bwd) !== "2026-05-22") throw new Error("Sun roll backward to Fri failed");
if (getISOStr(resRoll[0].fwd_step1) !== "2026-05-26") throw new Error("Sat roll fwd + 1 bday = Tue failed");
if (getISOStr(resRoll[0].bwd_step1) !== "2026-05-21") throw new Error("Sat roll bwd - 1 bday = Thu failed");

// 5. Month, Year, and Leap Year boundaries
const dfLeapAndYear = $df.data([
    { date: "2024-02-28", n: 1 },  // Leap year Feb 28 Wed + 1 -> Feb 29 Thu
    { date: "2024-02-28", n: 2 },  // Leap year Feb 28 Wed + 2 -> Mar 1 Fri
    { date: "2023-02-28", n: 1 },  // Non-leap year Feb 28 Tue + 1 -> Mar 1 Wed
    { date: "2025-12-31", n: 1 },  // Dec 31 Wed + 1 with Jan 1 holiday -> Jan 2 Fri
    { date: "2026-01-30", n: 1 }   // Jan 30 Fri + 1 -> Feb 2 Mon
], { date: $df.Date, n: $df.Int32 });

const resLeap = dfLeapAndYear.select([
    $df.col("date").dt.offsetDay($df.col("n"), {
        excludeWeekdays: [0, 6],
        holidays: ["2026-01-01"]
    }).alias("boundary_res")
]).toDicts() as any[];

if (getISOStr(resLeap[0].boundary_res) !== "2024-02-29") throw new Error("Leap year Feb 28 + 1 failed");
if (getISOStr(resLeap[1].boundary_res) !== "2024-03-01") throw new Error("Leap year Feb 28 + 2 failed");
if (getISOStr(resLeap[2].boundary_res) !== "2023-03-01") throw new Error("Non-leap year Feb 28 + 1 failed");
if (getISOStr(resLeap[3].boundary_res) !== "2026-01-02") throw new Error("Year end boundary failed");
if (getISOStr(resLeap[4].boundary_res) !== "2026-02-02") throw new Error("Month boundary Jan 30 + 1 failed");

// 6. Time and Sub-day Preservations (Time of Day should be preserved)
const dfTime = $df.data([
    { dt: "2026-05-18T14:32:45.678Z" },
    { dt: "2026-05-18T00:00:00.001Z" },
    { dt: "2026-05-18T23:59:59.999Z" }
], { dt: $df.Datetime });

const resTime = dfTime.select([
    $df.col("dt").dt.offsetDay(1).alias("plus1"),
    $df.col("dt").dt.offsetDay(5, { excludeWeekdays: [0, 6] }).alias("plus5_biz")
]).toDicts() as any[];

if (getFullISO(resTime[0].plus1) !== "2026-05-19T14:32:45.678Z") throw new Error("Time preservation failed on plus1");
if (getFullISO(resTime[1].plus1) !== "2026-05-19T00:00:00.001Z") throw new Error("Early morning time preservation failed");
if (getFullISO(resTime[2].plus1) !== "2026-05-19T23:59:59.999Z") throw new Error("Late night time preservation failed");
if (getFullISO(resTime[0].plus5_biz) !== "2026-05-25T14:32:45.678Z") throw new Error("Time preservation failed across weekend");

// 7. Missing, Null, Undefined & Mixed Inputs
const dfMixed = $df.data([
    { date: "not-a-valid-date", n: 1 },
    { date: null, n: 5 },
    { date: "2026-05-20", n: null },
    { date: undefined, n: 2 },
    { date: "2026-05-20", n: undefined },
    { date: "2026-05-20", n: 0 }
]);

const resMixed = dfMixed.select([
    $df.col("date").dt.offsetDay($df.col("n")).alias("mixed_out")
]).toDicts() as any[];

if (resMixed[0].mixed_out !== null) throw new Error("Invalid date string should produce null");
if (resMixed[1].mixed_out !== null) throw new Error("Null date should produce null");
if (resMixed[2].mixed_out !== null) throw new Error("Null offset should produce null");
if (resMixed[3].mixed_out !== null) throw new Error("Undefined date should produce null");
if (resMixed[4].mixed_out !== null) throw new Error("Undefined offset should produce null");
if (getISOStr(resMixed[5].mixed_out) !== "2026-05-20") throw new Error("Valid date with 0 offset should match original");

// 8. Custom Workweeks (Middle East Sunday-Thursday with Friday/Saturday off)
const dfME = $df.data([
    { date: "2026-05-21", n: 1 }, // Thursday + 1 -> Sunday 2026-05-24
    { date: "2026-05-24", n: -1 } // Sunday - 1 -> Thursday 2026-05-21
], { date: $df.Date, n: $df.Int32 });

const resME = dfME.select([
    $df.col("date").dt.offsetDay($df.col("n"), { excludeWeekdays: [5, 6] }).alias("me_offset")
]).toDicts() as any[];

if (getISOStr(resME[0].me_offset) !== "2026-05-24") throw new Error("ME workweek Thu + 1 bday failed");
if (getISOStr(resME[1].me_offset) !== "2026-05-21") throw new Error("ME workweek Sun - 1 bday failed");

console.log("✓ TemporalExpr.offsetDay tests passed!");

