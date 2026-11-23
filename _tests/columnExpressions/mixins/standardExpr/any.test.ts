declare const process: any;
import { $df } from "df-script";

console.log("Running StandardExpr.any tests...");


const df = $df.dataFrame([{ val: false }, { val: true }, { val: false }]);
const res1 = df.select([$df.col("val").any().alias("a")]).toDicts() as any[];
if (res1[0].a !== true) throw new Error("any failed");
const df2 = $df.dataFrame([{ val: false }, { val: false }]);
const res2 = df2.select([$df.col("val").any().alias("a")]).toDicts() as any[];
if (res2[0].a !== false) throw new Error("any 2 failed");


console.log("✓ StandardExpr.any tests passed!");
