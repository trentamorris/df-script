declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.lenChars tests...");


const df = $df.data([
    { phrase: "hello" },
    { phrase: "café" },
    { phrase: null }
]);

const res = df.select([$df.col("phrase").str.lenChars().alias("lc")]).toDicts() as any[];
if (res[0].lc !== 5 || res[1].lc !== 4) throw new Error("lenChars failed");
if (res[2].lc !== null) throw new Error("lenChars null failed");


console.log("✓ StringExpr.lenChars tests passed!");
