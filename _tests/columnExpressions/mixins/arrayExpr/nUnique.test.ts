declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.nUnique tests...");


const df = $df.data([
    { tags: ["apple", "banana", "apple", "cherry"] },
    { tags: [] },
    { tags: null }
]);

const res = df.select([$df.col("tags").arr.nUnique().alias("nu")]).toDicts() as any[];
if (res[0].nu !== 3) throw new Error("Expected 3 unique tags");
if (res[1].nu !== 0) throw new Error("Expected 0");
if (res[2].nu !== null) throw new Error("Expected null");


console.log("✓ ArrayExpr.nUnique tests passed!");
