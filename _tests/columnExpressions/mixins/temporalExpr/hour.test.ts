declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.hour tests...");


const df = $df.data([
    { ts: "2026-05-25T10:37:16.123Z" },
    { ts: "2026-06-01T00:00:00.000Z" },
    { ts: null }
], { ts: $df.Datetime });

const res = df.select([
    $df.col("ts").dt.hour().alias("h_utc"),
    $df.col("ts").dt.hour("Asia/Tokyo").alias("h_tokyo"),
    $df.col("ts").dt.hour("America/New_York").alias("h_ny")
]).toDicts() as any[];

if (res[0].h_utc !== 10) throw new Error("Expected UTC hour 10");
if (res[1].h_tokyo !== 9) throw new Error("Expected Tokyo hour 9");
if (res[1].h_ny !== 20) throw new Error("Expected NY hour 20");
if (res[2].h_utc !== null) throw new Error("Expected null for null ts");


console.log("✓ TemporalExpr.hour tests passed!");
