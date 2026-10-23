declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.rpad tests...");


const df = $df.data([
    { digits: "42" },
    { digits: null }
]);

const res = df.select([$df.col("digits").str.rpad(5, "-").alias("p")]).toDicts() as any[];
if (res[0].p !== "42---") throw new Error("rpad failed");
if (res[1].p !== null) throw new Error("rpad null failed");


console.log("✓ StringExpr.rpad tests passed!");
