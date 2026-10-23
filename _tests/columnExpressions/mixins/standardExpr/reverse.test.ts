declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.reverse tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }]);
const res = df.select([$df.col("val").reverse().alias("r")]).toDicts() as any[];
if (res[0].r !== 30 || res[1].r !== 20 || res[2].r !== 10) throw new Error("reverse failed");


console.log("✓ StandardExpr.reverse tests passed!");
