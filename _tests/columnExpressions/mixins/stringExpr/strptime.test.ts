declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.strptime tests...");


const df = $df.data([
    { date_str: "2026-05-25 14:30:15" },
    { date_str: null }
]);

const res = df.select([
    $df.col("date_str").str.strptime({ format: "%Y-%m-%d %H:%M:%S" }).alias("d")
]).toDicts() as any[];

if (res[0].d.toISOString() !== "2026-05-25T14:30:15.000Z") throw new Error("strptime failed");
if (res[1].d !== null) throw new Error("strptime null failed");


console.log("✓ StringExpr.strptime tests passed!");
