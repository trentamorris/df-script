declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.tan tests...");


const df = $df.data([{ val: -5.5 }, { val: 4.88 }, { val: null }]);
const res = df.select([$df.col("val").tan().alias("t")]).toDicts() as any[];
if (Math.abs(res[0].t - Math.tan(-5.5)) > 1e-6 || Math.abs(res[1].t - Math.tan(4.88)) > 1e-6 || res[2].t !== null) throw new Error("tan failed");


console.log("✓ StandardExpr.tan tests passed!");
