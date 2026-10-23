declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.containsAny tests...");


const df = $df.data([
    { tags: ["apple", "banana"] },
    { typed_array: new Int32Array([10, 20, 30]) },
    { tags: null }
]);

const res = df.select([
    $df.col("tags").arr.containsAny(["banana", "grape"]).alias("has_any"),
    $df.col("tags").arr.containsAny(["pear", "grape"]).alias("has_none"),
    $df.col("typed_array").arr.containsAny(new Int32Array([10, 40])).alias("typed_any")
]).toDicts() as any[];

if (res[0].has_any !== true) throw new Error("Expected true");
if (res[0].has_none !== false) throw new Error("Expected false");
if (res[1].typed_any !== true) throw new Error("Expected typed_any true");
if (res[2].has_any !== null) throw new Error("Expected null");


console.log("✓ ArrayExpr.containsAny tests passed!");
