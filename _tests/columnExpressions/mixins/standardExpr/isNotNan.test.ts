declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.isNotNan tests...");

const df = $df.data([{ val: 10 }, { val: NaN }, { val: null }]);
const res = df.select([$df.col("val").isNotNan().alias("n")]).toDicts() as any[];
if (res[0].n !== true || res[1].n !== false || res[2].n !== null) throw new Error("isNotNan failed");

console.log("✓ StandardExpr.isNotNan tests passed!");
