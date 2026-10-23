declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.hasNulls tests...");


const df1 = $df.data([{ val: 10 }, { val: null }]);
const res1 = df1.select([$df.col("val").hasNulls().alias("h")]).toDicts() as any[];
if (res1[0].h !== true) throw new Error("hasNulls true failed");
const df2 = $df.data([{ val: 10 }, { val: 20 }]);
const res2 = df2.select([$df.col("val").hasNulls().alias("h")]).toDicts() as any[];
if (res2[0].h !== false) throw new Error("hasNulls false failed");


console.log("✓ StandardExpr.hasNulls tests passed!");
