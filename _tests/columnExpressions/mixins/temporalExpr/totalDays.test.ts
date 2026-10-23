declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.totalDays tests...");


const df = $df.data([
    { dur: 86400000 },
    { dur: 0 },
    { dur: null }
], { dur: $df.Float64 });

const res = df.select([$df.col("dur").dt.totalDays().alias("d")]).toDicts() as any[];
if (res[0].d !== 1) throw new Error("Expected 1 day");
if (res[1].d !== 0) throw new Error("Expected 0 days");
if (res[2].d !== null) throw new Error("Expected null");


console.log("✓ TemporalExpr.totalDays tests passed!");
