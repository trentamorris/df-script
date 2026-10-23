declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.median tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }, { val: 40 }]);
const res = df.select([$df.col("val").median().alias("m")]).toDicts() as any[];
if (res[0].m !== 25) throw new Error("median failed");


console.log("✓ StandardExpr.median tests passed!");
