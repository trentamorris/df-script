declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.skew tests...");


const df = $df.data([{ val: 1 }, { val: 2 }, { val: 3 }, { val: 4 }, { val: 5 }]);
const res = df.select([$df.col("val").skew().alias("s")]).toDicts() as any[];
if (typeof res[0].s !== "number") throw new Error("skew failed");


console.log("✓ StandardExpr.skew tests passed!");
