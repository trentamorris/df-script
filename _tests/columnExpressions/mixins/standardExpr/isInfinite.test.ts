declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.isInfinite tests...");

const df = $df.data([{ val: 10 }, { val: Infinity }, { val: -Infinity }, { val: null }]);
const res = df.select([$df.col("val").isInfinite().alias("i")]).toDicts() as any[];
if (res[0].i !== false || res[1].i !== true || res[2].i !== true || res[3].i !== null) throw new Error("isInfinite failed");

console.log("✓ StandardExpr.isInfinite tests passed!");
