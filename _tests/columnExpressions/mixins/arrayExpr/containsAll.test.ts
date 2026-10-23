declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.containsAll tests...");


const df = $df.data([
    { tags: ["apple", "banana", "cherry"] },
    { typed_array: new Int32Array([10, 20, 30]) },
    { tags: null }
]);

const res = df.select([
    $df.col("tags").arr.containsAll(["apple", "cherry"]).alias("has_both"),
    $df.col("tags").arr.containsAll(["apple", "grape"]).alias("has_missing"),
    $df.col("typed_array").arr.containsAll(new Int32Array([10, 30])).alias("typed_all")
]).toDicts() as any[];

if (res[0].has_both !== true) throw new Error("Expected true");
if (res[0].has_missing !== false) throw new Error("Expected false");
if (res[1].typed_all !== true) throw new Error("Expected typed_all true");
if (res[2].has_both !== null) throw new Error("Expected null");


console.log("✓ ArrayExpr.containsAll tests passed!");
