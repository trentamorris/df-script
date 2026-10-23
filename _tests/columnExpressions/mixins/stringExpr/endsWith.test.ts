declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.endsWith tests...");


const df = $df.data([
    { phrase: "DFScript is awesome!" },
    { phrase: "Hello world" },
    { phrase: null }
]);

const res = df.select([$df.col("phrase").str.endsWith("!").alias("ends")]).toDicts() as any[];
if (res[0].ends !== true) throw new Error("endsWith row 0 failed");
if (res[1].ends !== false) throw new Error("endsWith row 1 failed");
if (res[2].ends !== null) throw new Error("endsWith null failed");


console.log("✓ StringExpr.endsWith tests passed!");
