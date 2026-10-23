declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.count tests...");


const df = $df.data([{ val: 10 }, { val: null }, { val: 30 }]);
const res = df.select([$df.col("val").count().alias("c")]).toDicts() as any[];
if (res[0].c !== 2) throw new Error("count failed: " + res[0].c);


console.log("✓ StandardExpr.count tests passed!");
