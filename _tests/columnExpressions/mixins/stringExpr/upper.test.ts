declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.upper tests...");


const df = $df.data([
    { phrase: "hello" },
    { phrase: null }
]);

const res = df.select([$df.col("phrase").str.upper().alias("u")]).toDicts() as any[];
if (res[0].u !== "HELLO") throw new Error("upper failed");
if (res[1].u !== null) throw new Error("upper null failed");


console.log("✓ StringExpr.upper tests passed!");
