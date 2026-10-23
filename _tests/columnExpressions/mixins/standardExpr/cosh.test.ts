declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.cosh tests...");


const df = $df.data([{ val: -5.5 }, { val: 4.88 }, { val: null }]);
const res = df.select([$df.col("val").cosh().alias("c")]).toDicts() as any[];
if (Math.abs(res[0].c - Math.cosh(-5.5)) > 1e-6 || Math.abs(res[1].c - Math.cosh(4.88)) > 1e-6 || res[2].c !== null) throw new Error("cosh failed");


console.log("✓ StandardExpr.cosh tests passed!");
