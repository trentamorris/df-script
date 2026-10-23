declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.castTimeUnit tests...");


const df = $df.data([
    { ts: "2026-05-20T10:00:00.123Z" },
    { ts: null }
], { ts: $df.Datetime });

const res = df.withColumns($df.col("ts").dt.castTimeUnit("us").alias("ts_us")).toDicts() as any[];
if (res[0].ts_us.getTime() !== new Date("2026-05-20T10:00:00.123Z").getTime()) throw new Error("castTimeUnit failed");
if (res[1].ts_us !== null) throw new Error("castTimeUnit null failed");


console.log("✓ TemporalExpr.castTimeUnit tests passed!");
