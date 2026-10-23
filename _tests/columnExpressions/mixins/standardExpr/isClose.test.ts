declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.isClose tests...");

const df = $df.data([{ a: 1.000001, b: 1.0 }, { a: 1.1, b: 1.0 }]);
const res = df.select([$df.col("a").isClose($df.col("b"), { absTol: 1e-4 }).alias("c")]).toDicts() as any[];
if (res[0].c !== true || res[1].c !== false) throw new Error("isClose failed");

console.log("✓ StandardExpr.isClose tests passed!");
