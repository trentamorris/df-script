declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.millisecond tests...");


const df = $df.data([
    { ts: "2026-05-25T10:37:16.123Z" },
    { ts: null }
], { ts: $df.Datetime });

const res = df.select([$df.col("ts").dt.millisecond().alias("ms")]).toDicts() as any[];
if (res[0].ms !== 123) throw new Error("Expected 123 ms");
if (res[1].ms !== null) throw new Error("Expected null");


console.log("✓ TemporalExpr.millisecond tests passed!");
