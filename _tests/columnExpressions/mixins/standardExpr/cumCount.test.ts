declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.cumCount tests...");


const df = $df.data([{ val: 10 }, { val: null }, { val: 30 }]);
const res = df.select([$df.col("val").cumCount().alias("c")]).toDicts() as any[];
if (res[0].c !== 1 || res[1].c !== 1 || res[2].c !== 2) throw new Error("cumCount failed");


console.log("✓ StandardExpr.cumCount tests passed!");
