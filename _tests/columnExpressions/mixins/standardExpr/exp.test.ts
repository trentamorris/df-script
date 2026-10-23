declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.exp tests...");


const df = $df.data([{ val: 1 }, { val: 0 }, { val: null }]);
const res = df.select([$df.col("val").exp().alias("e")]).toDicts() as any[];
if (Math.abs(res[0].e - Math.E) > 1e-6 || res[1].e !== 1 || res[2].e !== null) throw new Error("exp failed");


console.log("✓ StandardExpr.exp tests passed!");
