declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.argMax tests...");


const df = $df.data([{ val: 10 }, { val: 50 }, { val: 20 }]);
const res = df.select([$df.col("val").argMax().alias("idx")]).toDicts() as any[];
if (res[0].idx !== 1) throw new Error("argMax failed: " + res[0].idx);


console.log("✓ StandardExpr.argMax tests passed!");
