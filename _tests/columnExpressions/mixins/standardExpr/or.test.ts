declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.or tests...");


const df = $df.data([
    { a: true, b: false },
    { a: false, b: false },
    { a: null, b: false }
]);
const res = df.select([$df.col("a").or($df.col("b")).alias("c")]).toDicts() as any[];
if (res[0].c !== true || res[1].c !== false || res[2].c !== null) throw new Error("or failed");


console.log("✓ StandardExpr.or tests passed!");
