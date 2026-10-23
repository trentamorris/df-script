declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.startsWith tests...");


const df = $df.data([
    { phrase: "DFScript is awesome!" },
    { phrase: "Hello world" },
    { phrase: null }
]);

const res = df.select([$df.col("phrase").str.startsWith("DF").alias("sw")]).toDicts() as any[];
if (res[0].sw !== true) throw new Error("startsWith row 0 failed");
if (res[1].sw !== false) throw new Error("startsWith row 1 failed");
if (res[2].sw !== null) throw new Error("startsWith null failed");


console.log("✓ StringExpr.startsWith tests passed!");
