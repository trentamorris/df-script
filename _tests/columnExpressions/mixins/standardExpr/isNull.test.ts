declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.isNull tests...");


const df = $df.data([{ val: 10 }, { val: null }]);
const res = df.select([$df.col("val").isNull().alias("n")]).toDicts() as any[];
if (res[0].n !== false || res[1].n !== true) throw new Error("isNull failed");


console.log("✓ StandardExpr.isNull tests passed!");
