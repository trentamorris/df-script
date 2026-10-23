declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.slice tests...");


const df = $df.data([
    { phrase: "DFScript is awesome!" },
    { phrase: null }
]);

const res = df.select([
    $df.col("phrase").str.slice(0, 8).alias("s1"),
    $df.col("phrase").str.slice(-8, 7).alias("s2")
]).toDicts() as any[];

if (res[0].s1 !== "DFScript" || res[0].s2 !== "awesome") throw new Error("slice failed");
if (res[1].s1 !== null) throw new Error("slice null failed");


console.log("✓ StringExpr.slice tests passed!");
