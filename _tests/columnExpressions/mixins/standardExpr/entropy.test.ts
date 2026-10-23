declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.entropy tests...");


const df = $df.data([{ val: 1 }, { val: 1 }, { val: 1 }]);
const res = df.select([$df.col("val").entropy().alias("e")]).toDicts() as any[];
if (res[0].e !== 0) throw new Error("entropy failed: " + res[0].e);


console.log("✓ StandardExpr.entropy tests passed!");
