declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.variance tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }]);
const res = df.select([$df.col("val").variance().alias("v")]).toDicts() as any[];
if (Math.abs(res[0].v - 100) > 1e-6) throw new Error("variance failed: " + res[0].v);


console.log("✓ StandardExpr.variance tests passed!");
