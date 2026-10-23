declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.nUnique tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 10 }, { val: 30 }]);
const res = df.select([$df.col("val").nUnique().alias("nu")]).toDicts() as any[];
if (res[0].nu !== 3) throw new Error("nUnique failed: " + res[0].nu);


console.log("✓ StandardExpr.nUnique tests passed!");
