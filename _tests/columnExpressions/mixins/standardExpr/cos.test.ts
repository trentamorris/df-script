declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.cos tests...");


const df = $df.data([{ val: -5.5 }, { val: 4.88 }, { val: null }]);
const res = df.select([$df.col("val").cos().alias("c")]).toDicts() as any[];
if (Math.abs(res[0].c - Math.cos(-5.5)) > 1e-6 || Math.abs(res[1].c - Math.cos(4.88)) > 1e-6 || res[2].c !== null) throw new Error("cos failed");


console.log("✓ StandardExpr.cos tests passed!");
