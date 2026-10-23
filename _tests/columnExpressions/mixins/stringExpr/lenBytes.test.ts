declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.lenBytes tests...");


const df = $df.data([
    { phrase: "hello" },
    { phrase: "café" },
    { phrase: null }
]);

const res = df.select([$df.col("phrase").str.lenBytes().alias("lb")]).toDicts() as any[];
if (res[0].lb !== 5) throw new Error("lenBytes 0 failed");
if (res[1].lb !== 5) throw new Error("lenBytes 1 (UTF-8 5 bytes) failed");
if (res[2].lb !== null) throw new Error("lenBytes null failed");


console.log("✓ StringExpr.lenBytes tests passed!");
