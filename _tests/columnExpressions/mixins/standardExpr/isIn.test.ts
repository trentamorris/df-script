declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.isIn tests...");


const df = $df.data([{ val: 10 }, { val: 25 }, { val: null }]);
const res = df.select([$df.col("val").isIn([10, 20, 30]).alias("i")]).toDicts() as any[];
if (res[0].i !== true || res[1].i !== false || res[2].i !== null) throw new Error("isIn failed");

// NaN membership: In canonical sets (like Polars), NaN in collection matches NaN in column
const dfNaN = $df.data([{ val: NaN }, { val: 10 }, { val: null }]);
const resNaN = dfNaN.select([$df.col("val").isIn([NaN, 20]).alias("i")]).toDicts() as any[];
if (resNaN[0].i !== true || resNaN[1].i !== false || resNaN[2].i !== null) throw new Error("isIn with NaN failed");

console.log("✓ StandardExpr.isIn tests passed!");
