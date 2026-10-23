declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.lower tests...");


const df = $df.data([
    { phrase: "HELLO World" },
    { phrase: null }
]);

const res = df.select([$df.col("phrase").str.lower().alias("l")]).toDicts() as any[];
if (res[0].l !== "hello world") throw new Error("lower failed");
if (res[1].l !== null) throw new Error("lower null failed");


console.log("✓ StringExpr.lower tests passed!");
