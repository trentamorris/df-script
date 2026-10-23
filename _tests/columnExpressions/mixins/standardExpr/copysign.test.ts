declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.copysign tests...");


const df = $df.data([{ a: -5.5, b: 10 }, { a: 4.88, b: -20 }, { a: null, b: 10 }]);
const res = df.select([$df.col("a").copysign($df.col("b")).alias("c")]).toDicts() as any[];
if (res[0].c !== 5.5 || res[1].c !== -4.88 || res[2].c !== null) throw new Error("copysign failed");


console.log("✓ StandardExpr.copysign tests passed!");
