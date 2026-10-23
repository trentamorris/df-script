declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.reverse tests...");


const df = $df.data([
    { phrase: "hello" },
    { phrase: null }
]);

const res = df.select([$df.col("phrase").str.reverse().alias("r")]).toDicts() as any[];
if (res[0].r !== "olleh") throw new Error("reverse failed");
if (res[1].r !== null) throw new Error("reverse null failed");


console.log("✓ StringExpr.reverse tests passed!");
