declare const process: any;
import { $df, ObjectDataType } from "../../../../src/index";

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

// Edge cases: Dynamic column expression target, empty arrays, null values, TypedArrays
const dfEdge = $df.data([
    { list: ["a", "b", "c"], targets: ["a", "c"] },
    { list: ["a", "b"], targets: ["a", "c"] },
    { list: [], targets: [] },
    { list: ["a"], targets: [] },
    { list: ["a"], targets: null },
    { list: null, targets: ["a"] },
    { list: new Float64Array([1.5, 2.5]), targets: new Float64Array([1.5]) }
], { list: ObjectDataType, targets: ObjectDataType });

const resEdge = dfEdge.select(
    $df.col("list").arr.containsAll($df.col("targets")).alias("dyn_all")
).toDicts() as any[];

if (resEdge[0].dyn_all !== true) throw new Error("Expected dyn_all true for subset");
if (resEdge[1].dyn_all !== false) throw new Error("Expected dyn_all false for missing");
if (resEdge[2].dyn_all !== true) throw new Error("Expected dyn_all true for empty list with empty targets");
if (resEdge[3].dyn_all !== true) throw new Error("Expected dyn_all true for empty targets");
if (resEdge[4].dyn_all !== null) throw new Error("Expected dyn_all null for null target column (Kleene logic)");
if (resEdge[5].dyn_all !== null) throw new Error("Expected dyn_all null for null list column (Kleene logic)");
if (resEdge[6].dyn_all !== true) throw new Error("Expected dyn_all true for Float64Array");

console.log("✓ ArrayExpr.containsAll tests passed!");
