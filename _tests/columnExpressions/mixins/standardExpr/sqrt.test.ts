declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.sqrt tests...");


const df = $df.data([{ val: 144 }, { val: -9 }, { val: null }]);
const res = df.select([$df.col("val").sqrt().alias("s")]).toDicts() as any[];
if (res[0].s !== 12 || res[1].s !== null || res[2].s !== null) throw new Error("sqrt failed");


console.log("✓ StandardExpr.sqrt tests passed!");
