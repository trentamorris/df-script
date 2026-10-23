declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.toTitleCase tests...");


const df = $df.data([
    { phrase: "hello world" },
    { phrase: null }
]);

const res = df.select([$df.col("phrase").str.toTitleCase().alias("t")]).toDicts() as any[];
if (res[0].t !== "Hello World") throw new Error("toTitleCase failed");
if (res[1].t !== null) throw new Error("toTitleCase null failed");


console.log("✓ StringExpr.toTitleCase tests passed!");
