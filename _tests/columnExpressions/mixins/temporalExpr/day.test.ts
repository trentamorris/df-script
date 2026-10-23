declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.day tests...");


const df = $df.data([
    { date: "2024-02-29" },
    { date: "2026-06-01T00:00:00.000Z" },
    { date: null }
], { date: $df.Datetime });

const res = df.select([
    $df.col("date").dt.day().alias("day_utc"),
    $df.col("date").dt.day("Asia/Tokyo").alias("tokyo_day"),
    $df.col("date").dt.day("America/New_York").alias("ny_day")
]).toDicts() as any[];

if (res[0].day_utc !== 29) throw new Error("Expected day 29");
if (res[1].tokyo_day !== 1) throw new Error("Expected tokyo day 1");
if (res[1].ny_day !== 31) throw new Error("Expected ny day 31 (previous day in NY)");
if (res[2].day_utc !== null) throw new Error("Expected null for null input");


console.log("✓ TemporalExpr.day tests passed!");
