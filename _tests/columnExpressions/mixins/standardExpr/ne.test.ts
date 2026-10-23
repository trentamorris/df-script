declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.ne tests...");


const df = $df.data([{ a: 10, b: 10 }, { a: 10, b: 20 }, { a: null, b: null }]);
const res = df.select([$df.col("a").ne($df.col("b")).alias("n")]).toDicts() as any[];
if (res[0].n !== false || res[1].n !== true || res[2].n !== null) throw new Error("ne failed");

// NaN edge cases: In IEEE 754 & standard boolean comparisons, NaN !== NaN is true
const dfNaN = $df.data([
    { a: NaN, b: NaN },
    { a: NaN, b: 10 },
    { a: 10, b: NaN },
    { a: NaN, b: null }
]);
const resNaN = dfNaN.select([$df.col("a").ne($df.col("b")).alias("n")]).toDicts() as any[];
if (resNaN[0].n !== true) throw new Error("NaN ne NaN should be true: " + resNaN[0].n);
if (resNaN[1].n !== true) throw new Error("NaN ne number should be true: " + resNaN[1].n);
if (resNaN[2].n !== true) throw new Error("number ne NaN should be true: " + resNaN[2].n);
if (resNaN[3].n !== null) throw new Error("NaN ne null should be null: " + resNaN[3].n);

console.log("✓ StandardExpr.ne tests passed!");
