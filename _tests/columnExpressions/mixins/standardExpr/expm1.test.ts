declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.expm1 tests...");


const df = $df.data([{ val: 0 }, { val: 2 }, { val: null }]);
const res = df.select([$df.col("val").expm1().alias("e")]).toDicts() as any[];
if (res[0].e !== 0 || Math.abs(res[1].e - (Math.exp(2) - 1)) > 1e-6 || res[2].e !== null) throw new Error("expm1 failed");


console.log("✓ StandardExpr.expm1 tests passed!");
