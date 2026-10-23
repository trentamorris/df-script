declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.negate tests...");


const df = $df.data([{ val: -5.5 }, { val: 4.88 }, { val: null }]);
const res = df.select([$df.col("val").negate().alias("n")]).toDicts() as any[];
if (res[0].n !== 5.5 || res[1].n !== -4.88 || res[2].n !== null) throw new Error("negate failed");


console.log("✓ StandardExpr.negate tests passed!");
