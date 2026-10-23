declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.product tests...");


const df = $df.data([{ val: 2 }, { val: 3 }, { val: 4 }]);
const res = df.select([$df.col("val").product().alias("p")]).toDicts() as any[];
if (res[0].p !== 24) throw new Error("product failed: " + res[0].p);


console.log("✓ StandardExpr.product tests passed!");
