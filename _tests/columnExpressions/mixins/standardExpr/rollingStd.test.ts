declare const process: any;
import { $df } from "df-script";

console.log("Running StandardExpr.rollingStd tests...");


const df = $df.dataFrame([{ val: 10 }, { val: 20 }, { val: 30 }]);
const res = df.select([$df.col("val").rollingStd(2).alias("s")]).toDicts() as any[];
if (typeof res[1].s !== "number") throw new Error("rollingStd failed");


console.log("✓ StandardExpr.rollingStd tests passed!");
