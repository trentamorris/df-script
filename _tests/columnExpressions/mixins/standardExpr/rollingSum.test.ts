declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.rollingSum tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }, { val: 40 }]);
const res = df.select([$df.col("val").rollingSum(2).alias("s")]).toDicts() as any[];
if (res[0].s !== 10 || res[1].s !== 30 || res[2].s !== 50 || res[3].s !== 70) throw new Error("rollingSum failed");


console.log("✓ StandardExpr.rollingSum tests passed!");
