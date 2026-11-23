declare const process: any;
import { $df } from "df-script";

console.log("Running StandardExpr.isNotNull tests...");


const df = $df.dataFrame([{ val: 10 }, { val: null }]);
const res = df.select([$df.col("val").isNotNull().alias("n")]).toDicts() as any[];
if (res[0].n !== true || res[1].n !== false) throw new Error("isNotNull failed");


console.log("✓ StandardExpr.isNotNull tests passed!");
