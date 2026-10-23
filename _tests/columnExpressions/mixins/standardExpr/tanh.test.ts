declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.tanh tests...");


const df = $df.data([{ val: -5.5 }, { val: 4.88 }, { val: null }]);
const res = df.select([$df.col("val").tanh().alias("t")]).toDicts() as any[];
if (Math.abs(res[0].t - Math.tanh(-5.5)) > 1e-6 || Math.abs(res[1].t - Math.tanh(4.88)) > 1e-6 || res[2].t !== null) throw new Error("tanh failed");


console.log("✓ StandardExpr.tanh tests passed!");
