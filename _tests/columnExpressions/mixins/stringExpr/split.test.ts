declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.split tests...");


const df = $df.data([
    { phrase: "DFScript is awesome!" },
    { phrase: null }
]);

const res = df.select([$df.col("phrase").str.split(" ").alias("s")]).toDicts() as any[];
if (JSON.stringify(res[0].s) !== JSON.stringify(["DFScript", "is", "awesome!"])) throw new Error("split failed");
if (res[1].s !== null) throw new Error("split null failed");


console.log("✓ StringExpr.split tests passed!");
