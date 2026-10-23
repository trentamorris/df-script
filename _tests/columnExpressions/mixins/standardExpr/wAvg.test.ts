declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.wAvg tests...");


const df = $df.data([
    { val: 10, weight: 1 },
    { val: 20, weight: 2 },
    { val: 30, weight: 3 }
]);
const res = df.select([$df.col("val").wAvg($df.col("weight")).alias("w")]).toDicts() as any[];
if (Math.abs(res[0].w - 23.333333) > 1e-4) throw new Error("wAvg failed: " + res[0].w);


console.log("✓ StandardExpr.wAvg tests passed!");
