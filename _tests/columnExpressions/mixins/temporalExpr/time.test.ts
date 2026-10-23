declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.time tests...");


const df = $df.data([
    { ts: "2026-05-25T10:37:16.123Z" },
    { ts: null }
], { ts: $df.Datetime });

const res = df.select([$df.col("ts").dt.time().alias("t")]).toDicts() as any[];
if (res[0].t !== "10:37:16.123") throw new Error("time extraction mismatch: " + res[0].t);
if (res[1].t !== null) throw new Error("null expected null");


console.log("✓ TemporalExpr.time tests passed!");
