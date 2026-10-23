declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.toInteger tests...");


const df = $df.data([
    { int_str: "123" },
    { int_str: null }
]);

const res = df.select([$df.col("int_str").str.toInteger().alias("i")]).toDicts() as any[];
if (res[0].i !== 123) throw new Error("toInteger failed");
if (res[1].i !== null) throw new Error("toInteger null failed");


console.log("✓ StringExpr.toInteger tests passed!");
