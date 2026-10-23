declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.head tests...");


const df = $df.data([
    { phrase: "DFScript is awesome!" },
    { phrase: null }
]);

const res = df.select([
    $df.col("phrase").str.head(8).alias("h8"),
    $df.col("phrase").str.head().alias("h1")
]).toDicts() as any[];

if (res[0].h8 !== "DFScript" || res[0].h1 !== "D") throw new Error("head failed");
if (res[1].h8 !== null) throw new Error("head null failed");


console.log("✓ StringExpr.head tests passed!");
