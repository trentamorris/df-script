declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.implode tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }]);
const res = df.select([$df.col("val").implode().alias("arr")]).toDicts() as any[];
if (JSON.stringify(res[0].arr) !== JSON.stringify([10, 20, 30])) throw new Error("implode failed");


console.log("✓ StandardExpr.implode tests passed!");
