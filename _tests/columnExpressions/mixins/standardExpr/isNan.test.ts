declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.isNan tests...");

const df = $df.data([{ val: 10 }, { val: NaN }, { val: null }]);
const res = df.select([$df.col("val").isNan().alias("n")]).toDicts() as any[];
if (res[0].n !== false || res[1].n !== true || res[2].n !== null) throw new Error("isNan failed");

console.log("✓ StandardExpr.isNan tests passed!");
