declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.not tests...");


const df = $df.data([{ val: true }, { val: false }, { val: null }]);
const res = df.select([$df.col("val").not().alias("n")]).toDicts() as any[];
if (res[0].n !== false || res[1].n !== true || res[2].n !== null) throw new Error("not failed");


console.log("✓ StandardExpr.not tests passed!");
