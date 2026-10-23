declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.radians tests...");


const df = $df.data([{ val: 180 }, { val: null }]);
const res = df.select([$df.col("val").radians().alias("r")]).toDicts() as any[];
if (Math.abs(res[0].r - Math.PI) > 1e-6 || res[1].r !== null) throw new Error("radians failed");


console.log("✓ StandardExpr.radians tests passed!");
