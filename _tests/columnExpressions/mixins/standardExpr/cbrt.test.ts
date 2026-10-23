declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.cbrt tests...");


const df = $df.data([{ val: 144 }, { val: -9 }, { val: null }]);
const res = df.select([$df.col("val").cbrt().alias("c")]).toDicts() as any[];
if (Math.abs(res[0].c - Math.cbrt(144)) > 1e-6 || Math.abs(res[1].c - Math.cbrt(-9)) > 1e-6 || res[2].c !== null) throw new Error("cbrt failed");


console.log("✓ StandardExpr.cbrt tests passed!");
