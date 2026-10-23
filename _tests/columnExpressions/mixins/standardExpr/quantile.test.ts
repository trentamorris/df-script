declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.quantile tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }, { val: 40 }, { val: 50 }]);
const res = df.select([$df.col("val").quantile(0.5).alias("q")]).toDicts() as any[];
if (res[0].q !== 30) throw new Error("quantile failed: " + res[0].q);


console.log("✓ StandardExpr.quantile tests passed!");
