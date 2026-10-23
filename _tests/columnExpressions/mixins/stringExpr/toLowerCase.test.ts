declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.toLowerCase tests...");


const df = $df.data([
    { phrase: "HELLO" },
    { phrase: null }
]);

const res = df.select([$df.col("phrase").str.toLowerCase().alias("l")]).toDicts() as any[];
if (res[0].l !== "hello") throw new Error("toLowerCase failed");
if (res[1].l !== null) throw new Error("toLowerCase null failed");


console.log("✓ StringExpr.toLowerCase tests passed!");
