declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.isLeapYear tests...");


const df = $df.data([
    { date: "2000-01-01T00:00:00Z" }, // 400-yr leap -> true
    { date: "1900-01-01T00:00:00Z" }, // 100-yr non-leap -> false
    { date: "2024-02-29T12:00:00Z" }, // 4-yr leap -> true
    { date: "2023-05-15T00:00:00Z" }, // non-leap -> false
    { date: "2024-01-01T03:00:00Z" }, // 2024 in UTC, but 2023-12-31 in NY
    { date: null }
], { date: $df.Datetime });

const res = df.select([
    $df.col("date").dt.isLeapYear().alias("leap_utc"),
    $df.col("date").dt.isLeapYear("America/New_York").alias("leap_ny")
]).toDicts() as any[];

if (res[0].leap_utc !== true) throw new Error("2000 expected leap year");
if (res[1].leap_utc !== false) throw new Error("1900 expected non-leap year");
if (res[2].leap_utc !== true) throw new Error("2024 expected leap year");
if (res[3].leap_utc !== false) throw new Error("2023 expected non-leap year");
if (res[4].leap_utc !== true || res[4].leap_ny !== false) throw new Error("TZ shift leap year failed");
if (res[5].leap_utc !== null) throw new Error("null expected null");


console.log("✓ TemporalExpr.isLeapYear tests passed!");
