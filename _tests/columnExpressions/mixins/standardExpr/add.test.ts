declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.add tests...");


const df = $df.data([{ a: 10, b: 3 }, { a: -20, b: 5 }, { a: null, b: 5 }]);
const res = df.select([
    $df.col("a").add($df.col("b")).alias("c1"),
    $df.col("a").add(5).alias("c2"),
    $df.col("a").add($df.lit(5)).alias("c3")
]).toDicts() as any[];
if (res[0].c1 !== 13 || res[0].c2 !== 15 || res[0].c3 !== 15) throw new Error("add failed");
if (res[1].c1 !== -15 || res[2].c1 !== null) throw new Error("add edge failed");


console.log("✓ StandardExpr.add tests passed!");
