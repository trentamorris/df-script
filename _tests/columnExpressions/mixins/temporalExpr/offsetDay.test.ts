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

// =========================================================================
// 10/10 COMPLEX FRONTIER EDGE CASES
// =========================================================================

// 9. Edge Case 1: DST (Daylight Saving Time) Spring Forward / Fall Back Wall-Clock Invariance
// US Spring forward occurred March 8, 2026 (Sunday). Advance across the DST gap in localized timezone timestamps
const dfDST = $df.data([
    { dt: "2026-03-06T02:30:00.000-05:00", n: 1 }, // Friday 02:30 EST + 1 bday -> skips weekend (and DST skip) -> Monday 02:30 EDT
    { dt: "2026-10-30T01:30:00.000-04:00", n: 1 }, // Friday 01:30 EDT before fall-back -> Monday 01:30 EST
], { dt: $df.Datetime, n: $df.Int32 });

const resDST = dfDST.select([
    $df.col("dt").dt.offsetDay($df.col("n"), { excludeWeekdays: [0, 6] }).alias("dst_res")
]).toDicts() as any[];

if (getISOStr(resDST[0].dst_res) !== "2026-03-09") throw new Error(`DST spring forward date match failed: ${getISOStr(resDST[0].dst_res)}`);
if (getISOStr(resDST[1].dst_res) !== "2026-11-02") throw new Error(`DST fall back date match failed: ${getISOStr(resDST[1].dst_res)}`);

// 10. Edge Case 2: Multi-Month Holiday Drought (Skipping an entire month of holidays)
// Every day in February 2026 is registered as a holiday
const allFebHolidays: string[] = [];
for (let d = 1; d <= 28; d++) {
    allFebHolidays.push(`2026-02-${String(d).padStart(2, "0")}`);
}

const dfMonthDrought = $df.data([
    { date: "2026-01-30", n: 1 },   // Friday Jan 30 + 1 bday -> skips Jan 31 Sat, Feb 1 Sun, ALL Feb holidays -> Monday Mar 2 (+31 cal days)
    { date: "2026-03-02", n: -1 },  // Monday Mar 02 - 1 bday -> skips Mar 1 Sun, Feb 28 Sat, ALL Feb holidays -> Friday Jan 30 (-31 cal days)
], { date: $df.Date, n: $df.Int32 });

const resDrought = dfMonthDrought.select([
    $df.col("date").dt.offsetDay($df.col("n"), {
        excludeWeekdays: [0, 6],
        holidays: allFebHolidays
    }).alias("drought_res")
]).toDicts() as any[];

if (getISOStr(resDrought[0].drought_res) !== "2026-03-02") throw new Error(`Month drought forward failed: ${getISOStr(resDrought[0].drought_res)}`);
if (getISOStr(resDrought[1].drought_res) !== "2026-01-30") throw new Error(`Month drought backward failed: ${getISOStr(resDrought[1].drought_res)}`);

// 11. Edge Case 3: 1-Day Work Week (6-Day Weekend where only Wednesday is a working day)
const dfOneDay = $df.data([
    { date: "2026-05-20", n: 1 },   // Wednesday May 20 + 1 -> Wednesday May 27 (+7 cal days)
    { date: "2026-05-20", n: 4 },   // Wednesday May 20 + 4 -> Wednesday June 17 (+28 cal days)
    { date: "2026-05-20", n: -2 },  // Wednesday May 20 - 2 -> Wednesday May 6 (-14 cal days)
], { date: $df.Date, n: $df.Int32 });

const resOneDay = dfOneDay.select([
    $df.col("date").dt.offsetDay($df.col("n"), {
        excludeWeekdays: [0, 1, 2, 4, 5, 6] // Only Wed (3) is active
    }).alias("one_day_res")
]).toDicts() as any[];

if (getISOStr(resOneDay[0].one_day_res) !== "2026-05-27") throw new Error("1-day workweek +1 failed");
if (getISOStr(resOneDay[1].one_day_res) !== "2026-06-17") throw new Error("1-day workweek +4 failed");
if (getISOStr(resOneDay[2].one_day_res) !== "2026-05-06") throw new Error("1-day workweek -2 failed");

// 12. Edge Case 4: Roll on Starting Dates that are simultaneously Excluded Weekday AND Explicit Holiday
const dfSatHoliday = $df.data([
    { date: "2026-05-23" } // Saturday, also listed in holidays
], { date: $df.Date });

const resSatHol = dfSatHoliday.select([
    $df.col("date").dt.offsetDay(0, { excludeWeekdays: [0, 6], holidays: ["2026-05-23"], roll: "forward" }).alias("roll_fwd"),
    $df.col("date").dt.offsetDay(0, { excludeWeekdays: [0, 6], holidays: ["2026-05-23"], roll: "backward" }).alias("roll_bwd"),
    $df.col("date").dt.offsetDay(1, { excludeWeekdays: [0, 6], holidays: ["2026-05-23"], roll: "forward" }).alias("roll_fwd_step1")
]).toDicts() as any[];

if (getISOStr(resSatHol[0].roll_fwd) !== "2026-05-25") throw new Error("Sat weekend+holiday roll forward failed");
if (getISOStr(resSatHol[0].roll_bwd) !== "2026-05-22") throw new Error("Sat weekend+holiday roll backward failed");
if (getISOStr(resSatHol[0].roll_fwd_step1) !== "2026-05-26") throw new Error("Sat weekend+holiday roll forward + 1 bday failed");

// 13. Edge Case 5: Large Long-Term Horizons (e.g. 500 business days = 100 weeks = 700 calendar days)
const dfLarge = $df.data([
    { date: "2026-05-18", n: 250 },  // 50 weeks = 350 calendar days -> 2027-05-03
    { date: "2026-05-18", n: -250 }  // 50 weeks prior = -350 calendar days -> 2025-06-02
], { date: $df.Date, n: $df.Int32 });

const resLarge = dfLarge.select([
    $df.col("date").dt.offsetDay($df.col("n"), { excludeWeekdays: [0, 6] }).alias("large_res")
]).toDicts() as any[];

if (getISOStr(resLarge[0].large_res) !== "2027-05-03") throw new Error(`Large 250 forward failed: ${getISOStr(resLarge[0].large_res)}`);
if (getISOStr(resLarge[1].large_res) !== "2025-06-02") throw new Error(`Large 250 backward failed: ${getISOStr(resLarge[1].large_res)}`);

// 14. Edge Case 6: Mixed & Chaotic Holiday Format Handling in Column Expression Pipeline
const dfChaoticHol = $df.data([
    { date: "2026-05-18", n: 1 } // Monday + 1 bday with Tuesday formatted as Date obj, string, and timestamp
], { date: $df.Date, n: $df.Int32 });

const resChaotic = dfChaoticHol.select([
    $df.col("date").dt.offsetDay($df.col("n"), {
        excludeWeekdays: [0, 6],
        holidays: [
            "2026-05-19",
            new Date("2026-05-19T10:00:00Z"),
            Date.UTC(2026, 4, 19),
            "invalid-holiday",
            null as any,
            NaN as any
        ]
    }).alias("chaotic_res")
]).toDicts() as any[];

if (getISOStr(resChaotic[0].chaotic_res) !== "2026-05-20") throw new Error("Chaotic holiday representation failed to skip Tuesday");

// 15. Edge Case 7: Leap Day Feb 29 As Start Date With Positive and Negative Offsets
const dfLeapStart = $df.data([
    { date: "2024-02-29", n: 1 },  // Thursday leap day + 1 -> Friday Mar 1
    { date: "2024-02-29", n: 2 },  // Thursday leap day + 2 -> Monday Mar 4
    { date: "2024-02-29", n: -1 }, // Thursday leap day - 1 -> Wednesday Feb 28
    { date: "2024-02-29", n: -5 }  // Thursday leap day - 5 -> Thursday Feb 22
], { date: $df.Date, n: $df.Int32 });

const resLeapStart = dfLeapStart.select([
    $df.col("date").dt.offsetDay($df.col("n"), { excludeWeekdays: [0, 6] }).alias("leap_start_res")
]).toDicts() as any[];

if (getISOStr(resLeapStart[0].leap_start_res) !== "2024-03-01") throw new Error("Leap start +1 failed");
if (getISOStr(resLeapStart[1].leap_start_res) !== "2024-03-04") throw new Error("Leap start +2 failed");
if (getISOStr(resLeapStart[2].leap_start_res) !== "2024-02-28") throw new Error("Leap start -1 failed");
if (getISOStr(resLeapStart[3].leap_start_res) !== "2024-02-22") throw new Error("Leap start -5 failed");

// 16. Edge Case 8: Century Leap Year vs Normal Century Rule (Year 2000 vs 2100)
// Year 2000 was a leap year (Feb 29 exists); Year 2100 is NOT a leap year (Feb 28 followed by Mar 1)
const dfCentury = $df.data([
    { date: "2000-02-28", n: 1 }, // 2000 was leap -> Feb 29 (Tue)
    { date: "2100-02-28", n: 1 }  // 2100 not leap: Feb 28 is Sun. With roll="forward" to Mon Mar 1, + 1 bday -> Tue Mar 2
], { date: $df.Date, n: $df.Int32 });

const resCentury = dfCentury.select([
    $df.col("date").dt.offsetDay($df.col("n"), { excludeWeekdays: [0, 6], roll: "forward" }).alias("century_res")
]).toDicts() as any[];

if (getISOStr(resCentury[0].century_res) !== "2000-02-29") throw new Error("Year 2000 leap century failed");
if (getISOStr(resCentury[1].century_res) !== "2100-03-02") throw new Error(`Year 2100 non-leap century failed: ${getISOStr(resCentury[1].century_res)}`);

// 17. Edge Case 9: Millisecond Sub-Zero Time Boundary Neutrality
// 23:59:59.999Z + 1 calendar day must land on EXACTLY 23:59:59.999Z the next day without rolling over an extra second
const dfMicroBoundary = $df.data([
    { dt: "2026-05-18T23:59:59.999Z", n: 1 },
    { dt: "2026-05-18T00:00:00.000Z", n: -1 }
], { dt: $df.Datetime, n: $df.Int32 });

const resMicro = dfMicroBoundary.select([
    $df.col("dt").dt.offsetDay($df.col("n")).alias("boundary_dt")
]).toDicts() as any[];

if (getFullISO(resMicro[0].boundary_dt) !== "2026-05-19T23:59:59.999Z") throw new Error("End-of-day millisecond preservation failed");
if (getFullISO(resMicro[1].boundary_dt) !== "2026-05-17T00:00:00.000Z") throw new Error("Start-of-day backward preservation failed");

// 18. Edge Case 10: Chaining offsetDay with Other Expression Transforms
// Testing offsetDay combined in a pipeline with dt.month(), dt.year(), and arithmetic
const dfPipeline = $df.data([
    { date: "2026-05-29" } // Friday May 29 + 1 bday -> June 1 (new month)
], { date: $df.Date });

const resPipeline = dfPipeline.select([
    $df.col("date").dt.offsetDay(1, { excludeWeekdays: [0, 6] }).dt.month().alias("next_month"),
    $df.col("date").dt.offsetDay(1, { excludeWeekdays: [0, 6] }).dt.day().alias("next_day")
]).toDicts() as any[];

if (resPipeline[0].next_month !== 6) throw new Error(`Pipeline month chain failed: ${resPipeline[0].next_month}`);
if (resPipeline[0].next_day !== 1) throw new Error(`Pipeline day chain failed: ${resPipeline[0].next_day}`);

console.log("✓ TemporalExpr.offsetDay tests passed!");


