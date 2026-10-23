declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.anyNull tests...");


const df1 = $df.data([{ val: 1 }, { val: null }]);
const res1 = df1.select([$df.col("val").anyNull().alias("a")]).toDicts() as any[];
if (res1[0].a !== true) throw new Error("anyNull true failed");
const df2 = $df.data([{ val: 1 }, { val: 2 }]);
const res2 = df2.select([$df.col("val").anyNull().alias("a")]).toDicts() as any[];
if (res2[0].a !== false) throw new Error("anyNull false failed");


console.log("✓ StandardExpr.anyNull tests passed!");
