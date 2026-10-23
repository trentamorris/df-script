declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.avg tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }]);
const res = df.select([$df.col("val").avg().alias("a")]).toDicts() as any[];
if (res[0].a !== 20) throw new Error("avg failed");


console.log("✓ StandardExpr.avg tests passed!");
