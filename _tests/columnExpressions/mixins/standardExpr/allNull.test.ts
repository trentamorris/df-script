declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.allNull tests...");


const df1 = $df.data([{ val: null }, { val: null }]);
const res1 = df1.select([$df.col("val").allNull().alias("a")]).toDicts() as any[];
if (res1[0].a !== true) throw new Error("allNull true failed");
const df2 = $df.data([{ val: 1 }, { val: null }]);
const res2 = df2.select([$df.col("val").allNull().alias("a")]).toDicts() as any[];
if (res2[0].a !== false) throw new Error("allNull false failed");


console.log("✓ StandardExpr.allNull tests passed!");
