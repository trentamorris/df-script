declare const process: any;
import { $df } from "df-script";

console.log("Running StandardExpr.mode tests...");


const df = $df.dataFrame([{ val: "apple" }, { val: "banana" }, { val: "apple" }]);
const res = df.select([$df.col("val").mode().alias("m")]).toDicts() as any[];
if (res[0].m.length !== 1 || res[0].m[0] !== "apple") throw new Error("mode failed");


console.log("✓ StandardExpr.mode tests passed!");
