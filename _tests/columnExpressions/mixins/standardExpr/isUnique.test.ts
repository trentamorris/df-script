declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.isUnique tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 10 }, { val: 30 }]);
const res = df.select([$df.col("val").isUnique().alias("u")]).toDicts() as any[];
if (res[0].u !== false || res[1].u !== true || res[2].u !== false || res[3].u !== true) throw new Error("isUnique failed");


console.log("✓ StandardExpr.isUnique tests passed!");
