declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.log1p tests...");


const df = $df.data([{ val: 0 }, { val: 2 }, { val: null }]);
const res = df.select([$df.col("val").log1p().alias("l")]).toDicts() as any[];
if (res[0].l !== 0 || Math.abs(res[1].l - Math.log1p(2)) > 1e-6 || res[2].l !== null) throw new Error("log1p failed");


console.log("✓ StandardExpr.log1p tests passed!");
