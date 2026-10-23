declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.mode tests...");

const df = $df.data([
    { tags: ["apple", "banana", "apple", "cherry"] },
    { tags: [] },
    { tags: null }
]);

const res = df.select([$df.col("tags").arr.mode().alias("m")]).toDicts() as any[];
if (res[0].m.length !== 1 || res[0].m[0] !== "apple") throw new Error("Expected ['apple']");
if (res[1].m !== null) throw new Error("Expected null for empty array mode");
if (res[2].m !== null) throw new Error("Expected null for null array mode");

console.log("✓ ArrayExpr.mode tests passed!");
