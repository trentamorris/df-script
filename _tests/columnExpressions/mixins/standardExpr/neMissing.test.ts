declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.neMissing tests...");


const df = $df.data([{ a: 10, b: 10 }, { a: 10, b: 20 }, { a: null, b: null }]);
const res = df.select([$df.col("a").neMissing($df.col("b")).alias("n")]).toDicts() as any[];
if (res[0].n !== false || res[1].n !== true || res[2].n !== false) throw new Error("neMissing failed");


console.log("✓ StandardExpr.neMissing tests passed!");
