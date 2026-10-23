declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.and tests...");


const df = $df.data([
    { a: true, b: true },
    { a: true, b: false },
    { a: false, b: false },
    { a: null, b: true }
]);
const res = df.select([$df.col("a").and($df.col("b")).alias("c")]).toDicts() as any[];
if (res[0].c !== true || res[1].c !== false || res[2].c !== false || res[3].c !== null) throw new Error("and failed");


console.log("✓ StandardExpr.and tests passed!");
