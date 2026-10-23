declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.le tests...");


const df = $df.data([{ a: 10, b: 10 }, { a: 5, b: 10 }, { a: 15, b: 10 }]);
const res = df.select([$df.col("a").le($df.col("b")).alias("l")]).toDicts() as any[];
if (res[0].l !== true || res[1].l !== true || res[2].l !== false) throw new Error("le failed");

// NaN edge cases: Any inequality comparison with NaN evaluates to false in IEEE 754
const dfNaN = $df.data([
    { a: NaN, b: 10 },
    { a: 10, b: NaN },
    { a: NaN, b: NaN },
    { a: NaN, b: null }
]);
const resNaN = dfNaN.select([$df.col("a").le($df.col("b")).alias("l")]).toDicts() as any[];
if (resNaN[0].l !== false) throw new Error("NaN le 10 should be false: " + resNaN[0].l);
if (resNaN[1].l !== false) throw new Error("10 le NaN should be false: " + resNaN[1].l);
if (resNaN[2].l !== false) throw new Error("NaN le NaN should be false: " + resNaN[2].l);
if (resNaN[3].l !== null) throw new Error("NaN le null should be null: " + resNaN[3].l);

console.log("✓ StandardExpr.le tests passed!");
