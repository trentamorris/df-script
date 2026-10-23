declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.totalMicroseconds tests...");


const df = $df.data([
    { dur: 123456789 },
    { dur: null }
], { dur: $df.Float64 });

const res = df.select([$df.col("dur").dt.totalMicroseconds().alias("us")]).toDicts() as any[];
if (res[0].us !== 123456789000) throw new Error("Expected 123456789000 us");
if (res[1].us !== null) throw new Error("Expected null");


console.log("✓ TemporalExpr.totalMicroseconds tests passed!");
