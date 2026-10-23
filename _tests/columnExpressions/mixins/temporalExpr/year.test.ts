declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.year tests...");


const df = $df.data([
    { date: "2024-02-29" },
    { date: "2026-01-01T02:00:00.000Z" }, // 2026 UTC, 2025 in NY
    { date: null }
], { date: $df.Datetime });

const res = df.select([
    $df.col("date").dt.year().alias("y_utc"),
    $df.col("date").dt.year("America/New_York").alias("y_ny"),
    $df.col("date").dt.year("Asia/Tokyo").alias("y_tokyo")
]).toDicts() as any[];

if (res[0].y_utc !== 2024) throw new Error("Expected 2024");
if (res[1].y_utc !== 2026 || res[1].y_ny !== 2025) throw new Error("TZ year shift failed");
if (res[2].y_utc !== null) throw new Error("null expected null");


console.log("✓ TemporalExpr.year tests passed!");
