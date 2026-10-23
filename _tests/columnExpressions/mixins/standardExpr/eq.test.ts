declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.eq tests...");


const df = $df.data([{ a: 10, b: 10 }, { a: 10, b: 20 }, { a: null, b: null }]);
const res = df.select([$df.col("a").eq($df.col("b")).alias("e")]).toDicts() as any[];
if (res[0].e !== true || res[1].e !== false || res[2].e !== null) throw new Error("eq failed");

// NaN edge cases: In IEEE 754 & standard boolean comparisons, NaN === NaN is false
const dfNaN = $df.data([
    { a: NaN, b: NaN },
    { a: NaN, b: 10 },
    { a: 10, b: NaN },
    { a: NaN, b: null }
]);
const resNaN = dfNaN.select([$df.col("a").eq($df.col("b")).alias("e")]).toDicts() as any[];
if (resNaN[0].e !== false) throw new Error("NaN eq NaN should be false: " + resNaN[0].e);
if (resNaN[1].e !== false) throw new Error("NaN eq number should be false: " + resNaN[1].e);
if (resNaN[2].e !== false) throw new Error("number eq NaN should be false: " + resNaN[2].e);
if (resNaN[3].e !== null) throw new Error("NaN eq null should be null: " + resNaN[3].e);

console.log("✓ StandardExpr.eq tests passed!");
