declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.totalHours tests...");


const df = $df.data([
    { dur: 3600000 },
    { dur: -3600000 },
    { dur: null }
], { dur: $df.Float64 });

const res = df.select([$df.col("dur").dt.totalHours().alias("h")]).toDicts() as any[];
if (res[0].h !== 1.0) throw new Error("Expected 1 hour");
if (res[1].h !== -1.0) throw new Error("Expected -1 hour");
if (res[2].h !== null) throw new Error("Expected null");


console.log("✓ TemporalExpr.totalHours tests passed!");
