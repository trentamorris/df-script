declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.gt tests...");


const df = $df.data([{ a: 10, b: 10 }, { a: 15, b: 10 }, { a: 5, b: 10 }]);
const res = df.select([$df.col("a").gt($df.col("b")).alias("g")]).toDicts() as any[];
if (res[0].g !== false || res[1].g !== true || res[2].g !== false) throw new Error("gt failed");

// NaN edge cases: Any inequality comparison with NaN evaluates to false in IEEE 754
const dfNaN = $df.data([
    { a: NaN, b: 10 },
    { a: 10, b: NaN },
    { a: NaN, b: NaN },
    { a: NaN, b: null }
]);
const resNaN = dfNaN.select([$df.col("a").gt($df.col("b")).alias("g")]).toDicts() as any[];
if (resNaN[0].g !== false) throw new Error("NaN gt 10 should be false: " + resNaN[0].g);
if (resNaN[1].g !== false) throw new Error("10 gt NaN should be false: " + resNaN[1].g);
if (resNaN[2].g !== false) throw new Error("NaN gt NaN should be false: " + resNaN[2].g);
if (resNaN[3].g !== null) throw new Error("NaN gt null should be null: " + resNaN[3].g);

console.log("✓ StandardExpr.gt tests passed!");
