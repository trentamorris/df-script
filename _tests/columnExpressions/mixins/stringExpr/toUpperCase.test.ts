declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.toUpperCase tests...");


const df = $df.data([
    { phrase: "hello" },
    { phrase: null }
]);

const res = df.select([$df.col("phrase").str.toUpperCase().alias("u")]).toDicts() as any[];
if (res[0].u !== "HELLO") throw new Error("toUpperCase failed");
if (res[1].u !== null) throw new Error("toUpperCase null failed");


console.log("✓ StringExpr.toUpperCase tests passed!");
