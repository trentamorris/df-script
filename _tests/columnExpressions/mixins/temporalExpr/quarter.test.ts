declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.quarter tests...");


const df = $df.data([
    { date: "2024-02-29" },
    { date: "2026-05-25" },
    { date: "2026-01-01T02:00:00.000Z" }, // Q1 UTC, Q4 NY
    { date: null }
], { date: $df.Datetime });

const res = df.select([
    $df.col("date").dt.quarter().alias("q_utc"),
    $df.col("date").dt.quarter("America/New_York").alias("q_ny")
]).toDicts() as any[];

if (res[0].q_utc !== 1) throw new Error("Feb expected Q1");
if (res[1].q_utc !== 2) throw new Error("May expected Q2");
if (res[2].q_utc !== 1 || res[2].q_ny !== 4) throw new Error("TZ quarter shift failed");
if (res[3].q_utc !== null) throw new Error("null expected null");


console.log("✓ TemporalExpr.quarter tests passed!");
