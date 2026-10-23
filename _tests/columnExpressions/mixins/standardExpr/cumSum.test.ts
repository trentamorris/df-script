declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.cumSum tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }]);
const res = df.select([$df.col("val").cumSum().alias("c")]).toDicts() as any[];
if (res[0].c !== 10 || res[1].c !== 30 || res[2].c !== 60) throw new Error("cumSum failed");


console.log("✓ StandardExpr.cumSum tests passed!");
