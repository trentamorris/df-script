declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.last tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }]);
const res = df.select([$df.col("val").last().alias("l")]).toDicts() as any[];
if (res[0].l !== 30) throw new Error("last failed");


console.log("✓ StandardExpr.last tests passed!");
