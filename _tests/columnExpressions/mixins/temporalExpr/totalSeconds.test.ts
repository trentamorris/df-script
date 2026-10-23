declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.totalSeconds tests...");


const df = $df.data([
    { dur: 123456789 },
    { dur: null }
], { dur: $df.Float64 });

const res = df.select([$df.col("dur").dt.totalSeconds().alias("s")]).toDicts() as any[];
if (res[0].s !== 123456.789) throw new Error("Expected 123456.789 s");
if (res[1].s !== null) throw new Error("Expected null");


console.log("✓ TemporalExpr.totalSeconds tests passed!");
