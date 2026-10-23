declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.toTime tests...");


const df = $df.data([
    { time_str: "14:30:15.123" },
    { time_str: null }
]);

const res = df.select([$df.col("time_str").str.toTime().alias("t")]).toDicts() as any[];
if (res[0].t !== "14:30:15.123") throw new Error("toTime failed");
if (res[1].t !== null) throw new Error("toTime null failed");


console.log("✓ StringExpr.toTime tests passed!");
