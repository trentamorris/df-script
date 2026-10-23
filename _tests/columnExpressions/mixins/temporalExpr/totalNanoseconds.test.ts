declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.totalNanoseconds tests...");


const df = $df.data([
    { dur: 123456789 },
    { dur: null }
], { dur: $df.Float64 });

const res = df.select([$df.col("dur").dt.totalNanoseconds().alias("ns")]).toDicts() as any[];
if (res[0].ns !== 123456789000000) throw new Error("Expected 123456789000000 ns");
if (res[1].ns !== null) throw new Error("Expected null");


console.log("✓ TemporalExpr.totalNanoseconds tests passed!");
