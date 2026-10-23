declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.replaceAll tests...");


const df = $df.data([
    { phrase: "DFScript is awesome!" },
    { phrase: null }
]);

const res = df.select([
    $df.col("phrase").str.replaceAll("e", "3").alias("r1"),
    $df.col("phrase").str.replaceAll(/E/gi, "3").alias("r2")
]).toDicts() as any[];

if (res[0].r1 !== "DFScript is aw3som3!" || res[0].r2 !== "DFScript is aw3som3!") throw new Error("replaceAll failed");
if (res[1].r1 !== null) throw new Error("replaceAll null failed");


console.log("✓ StringExpr.replaceAll tests passed!");
