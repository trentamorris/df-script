declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.len tests...");


const df = $df.data([
    { phrase: "hello" },
    { phrase: null }
]);

const res = df.select([$df.col("phrase").str.len().alias("l")]).toDicts() as any[];
if (res[0].l !== 5) throw new Error("len failed");
if (res[1].l !== null) throw new Error("len null failed");


console.log("✓ StringExpr.len tests passed!");
