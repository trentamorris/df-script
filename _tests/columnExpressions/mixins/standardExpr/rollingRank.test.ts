declare const process: any;
import { $df } from "df-script";

console.log("Running StandardExpr.rollingRank tests...");


const df = $df.dataFrame([{ val: 10 }, { val: 20 }, { val: 15 }, { val: 30 }]);
const res = df.select([$df.col("val").rollingRank(2).alias("r")]).toDicts() as any[];
if (typeof res[0].r !== "number" || typeof res[1].r !== "number") throw new Error("rollingRank failed");


console.log("✓ StandardExpr.rollingRank tests passed!");
