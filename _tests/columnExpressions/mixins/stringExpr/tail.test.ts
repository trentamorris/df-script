declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.tail tests...");


const df = $df.data([
    { phrase: "DFScript is awesome!" },
    { phrase: null }
]);

const res = df.select([
    $df.col("phrase").str.tail(8).alias("t8"),
    $df.col("phrase").str.tail().alias("t1")
]).toDicts() as any[];

if (res[0].t8 !== "awesome!" || res[0].t1 !== "!") throw new Error("tail failed");
if (res[1].t8 !== null) throw new Error("tail null failed");


console.log("✓ StringExpr.tail tests passed!");
