declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.xor tests...");


const df = $df.data([
    { a: true, b: false },
    { a: true, b: true },
    { a: false, b: false },
    { a: null, b: false }
]);
const res = df.select([$df.col("a").xor($df.col("b")).alias("x")]).toDicts() as any[];
if (res[0].x !== true || res[1].x !== false || res[2].x !== false || res[3].x !== null) throw new Error("xor failed");


console.log("✓ StandardExpr.xor tests passed!");
