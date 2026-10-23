declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.abs tests...");


const df = $df.data([{ val: -5.5 }, { val: 4.88 }, { val: null }]);
const res = df.select([$df.col("val").abs().alias("a")]).toDicts() as any[];
if (res[0].a !== 5.5 || res[1].a !== 4.88 || res[2].a !== null) throw new Error("abs failed");


console.log("✓ StandardExpr.abs tests passed!");
