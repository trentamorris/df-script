declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.sinh tests...");


const df = $df.data([{ val: -5.5 }, { val: 4.88 }, { val: null }]);
const res = df.select([$df.col("val").sinh().alias("s")]).toDicts() as any[];
if (Math.abs(res[0].s - Math.sinh(-5.5)) > 1e-6 || Math.abs(res[1].s - Math.sinh(4.88)) > 1e-6 || res[2].s !== null) throw new Error("sinh failed");


console.log("✓ StandardExpr.sinh tests passed!");
