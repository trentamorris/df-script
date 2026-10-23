declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.over tests...");


const df = $df.data([
    { dept: "A", salary: 100 },
    { dept: "A", salary: 200 },
    { dept: "B", salary: 300 }
]);
const res = df.select([
    $df.col("dept"),
    $df.col("salary").mean().over("dept").alias("avg_sal")
]).toDicts() as any[];
if (res[0].avg_sal !== 150 || res[1].avg_sal !== 150 || res[2].avg_sal !== 300) throw new Error("over failed");


console.log("✓ StandardExpr.over tests passed!");
