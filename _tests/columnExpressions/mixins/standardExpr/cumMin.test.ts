declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.cumMin tests...");


const df = $df.data([{ val: 50 }, { val: 10 }, { val: 20 }, { val: 5 }]);
const res = df.select([$df.col("val").cumMin().alias("c")]).toDicts() as any[];
if (res[0].c !== 50 || res[1].c !== 10 || res[2].c !== 10 || res[3].c !== 5) throw new Error("cumMin failed");


console.log("✓ StandardExpr.cumMin tests passed!");
