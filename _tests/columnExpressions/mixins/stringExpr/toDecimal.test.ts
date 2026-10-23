declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.toDecimal tests...");


const df = $df.data([
    { decimal_str: "123.4567" },
    { decimal_str: null }
]);

const res = df.select([$df.col("decimal_str").str.toDecimal(10, 2).alias("dec")]).toDicts() as any[];
if (res[0].dec !== 123.46) throw new Error("toDecimal failed");
if (res[1].dec !== null) throw new Error("toDecimal null failed");


console.log("✓ StringExpr.toDecimal tests passed!");
