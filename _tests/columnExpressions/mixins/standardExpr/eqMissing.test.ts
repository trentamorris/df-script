declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.eqMissing tests...");


const df = $df.data([{ a: 10, b: 10 }, { a: 10, b: 20 }, { a: null, b: null }]);
const res = df.select([$df.col("a").eqMissing($df.col("b")).alias("e")]).toDicts() as any[];
if (res[0].e !== true || res[1].e !== false || res[2].e !== true) throw new Error("eqMissing failed");


console.log("✓ StandardExpr.eqMissing tests passed!");
