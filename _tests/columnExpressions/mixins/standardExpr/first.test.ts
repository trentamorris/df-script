declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.first tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }]);
const res = df.select([$df.col("val").first().alias("f")]).toDicts() as any[];
if (res[0].f !== 10) throw new Error("first failed");


console.log("✓ StandardExpr.first tests passed!");
