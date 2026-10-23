declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.timestamp tests...");


const df = $df.data([
    { ts: "2026-05-25T10:37:16.123Z" },
    { ts: null }
], { ts: $df.Datetime });

const t0 = new Date("2026-05-25T10:37:16.123Z").getTime();
const res = df.select([
    $df.col("ts").dt.timestamp().alias("ts_ms"),
    $df.col("ts").dt.timestamp("us").alias("ts_us")
]).toDicts() as any[];

if (res[0].ts_ms !== t0) throw new Error("timestamp ms mismatch");
if (res[0].ts_us !== BigInt(t0) * 1000n) throw new Error("timestamp us mismatch");
if (res[1].ts_ms !== null) throw new Error("timestamp null mismatch");


console.log("✓ TemporalExpr.timestamp tests passed!");
