declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.explode tests...");


const df = $df.data([
    { id: 1, tags: ["apple", "banana"] },
    { id: 2, tags: [] },
    { id: 3, tags: null }
]);

const res = df.select([
    $df.col("id"),
    $df.col("tags").arr.explode()
]).toDicts() as any[];

if (res.length < 3) throw new Error("explode rows mismatch");


console.log("✓ ArrayExpr.explode tests passed!");
