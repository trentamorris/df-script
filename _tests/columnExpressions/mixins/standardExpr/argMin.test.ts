declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.argMin tests...");


const df = $df.data([{ val: 50 }, { val: 10 }, { val: 20 }]);
const res = df.select([$df.col("val").argMin().alias("idx")]).toDicts() as any[];
if (res[0].idx !== 1) throw new Error("argMin failed: " + res[0].idx);


console.log("✓ StandardExpr.argMin tests passed!");
