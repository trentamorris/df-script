declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.totalMinutes tests...");


const df = $df.data([
    { dur: 60000 },
    { dur: -3600000 },
    { dur: null }
], { dur: $df.Float64 });

const res = df.select([$df.col("dur").dt.totalMinutes().alias("m")]).toDicts() as any[];
if (res[0].m !== 1) throw new Error("Expected 1 min");
if (res[1].m !== -60) throw new Error("Expected -60 min");
if (res[2].m !== null) throw new Error("Expected null");


console.log("✓ TemporalExpr.totalMinutes tests passed!");
