declare const process: any;
import { $df, ObjectDataType } from "../../../../src/index";

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

// Edge cases: Dynamic column expression target, empty arrays, null values, TypedArrays
const dfEdge = $df.data([
    { list: ["a", "b", "c"], targets: ["x", "c"] },
    { list: ["a", "b"], targets: ["x", "y"] },
    { list: [], targets: [] },
    { list: ["a"], targets: [] },
    { list: ["a"], targets: null },
    { list: null, targets: ["a"] },
    { list: new Float64Array([1.5, 2.5]), targets: new Float64Array([2.5, 9.9]) }
], { list: ObjectDataType, targets: ObjectDataType });

const resEdge = dfEdge.select(
    $df.col("list").arr.containsAny($df.col("targets")).alias("dyn_any")
).toDicts() as any[];

if (resEdge[0].dyn_any !== true) throw new Error("Expected dyn_any true for intersecting target");
if (resEdge[1].dyn_any !== false) throw new Error("Expected dyn_any false for disjoint target");
if (resEdge[2].dyn_any !== false) throw new Error("Expected dyn_any false for empty list with empty targets");
if (resEdge[3].dyn_any !== false) throw new Error("Expected dyn_any false for empty targets");
if (resEdge[4].dyn_any !== null) throw new Error("Expected dyn_any null for null target column (Kleene logic)");
if (resEdge[5].dyn_any !== null) throw new Error("Expected dyn_any null for null list column (Kleene logic)");
if (resEdge[6].dyn_any !== true) throw new Error("Expected dyn_any true for Float64Array match");

console.log("✓ ArrayExpr.containsAny tests passed!");
