declare const process: any;
import { $df } from "df-script";

console.log("Running StandardExpr.isFinite tests...");

const df = $df.dataFrame([{ val: 10 }, { val: Infinity }, { val: NaN }, { val: null }]);
const res = df.select([$df.col("val").isFinite().alias("f")]).toDicts() as any[];
if (res[0].f !== true || res[1].f !== false || res[2].f !== false || res[3].f !== null) throw new Error("isFinite failed");

console.log("✓ StandardExpr.isFinite tests passed!");
