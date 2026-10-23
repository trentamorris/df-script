declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.rollingQuantile tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }, { val: 40 }]);
const res = df.select([$df.col("val").rollingQuantile(0.5, 2).alias("q")]).toDicts() as any[];
if (res[0].q !== 10 || res[1].q !== 15 || res[2].q !== 25 || res[3].q !== 35) throw new Error("rollingQuantile failed");


console.log("✓ StandardExpr.rollingQuantile tests passed!");
