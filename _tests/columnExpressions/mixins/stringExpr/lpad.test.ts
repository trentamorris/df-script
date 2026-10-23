declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.lpad tests...");


const df = $df.data([
    { digits: "42" },
    { digits: null }
]);

const res = df.select([$df.col("digits").str.lpad(5, "*").alias("p")]).toDicts() as any[];
if (res[0].p !== "***42") throw new Error("lpad failed");
if (res[1].p !== null) throw new Error("lpad null failed");


console.log("✓ StringExpr.lpad tests passed!");
