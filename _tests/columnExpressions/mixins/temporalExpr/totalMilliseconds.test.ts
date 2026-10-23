declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.totalMilliseconds tests...");


const df = $df.data([
    { dur: 123456789 },
    { dur: null }
], { dur: $df.Float64 });

const res = df.select([$df.col("dur").dt.totalMilliseconds().alias("ms")]).toDicts() as any[];
if (res[0].ms !== 123456789) throw new Error("Expected 123456789 ms");
if (res[1].ms !== null) throw new Error("Expected null");


console.log("✓ TemporalExpr.totalMilliseconds tests passed!");
