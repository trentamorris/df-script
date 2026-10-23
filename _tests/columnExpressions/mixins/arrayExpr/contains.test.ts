declare const process: any;
import { $df, ObjectDataType } from "../../../../src/index";

console.log("Running ArrayExpr.contains tests...");


const df = $df.data([
    { tags: ["apple", "banana", "cherry"] },
    { tags: [] },
    { tags: null }
]);

const res = df.select([
    $df.col("tags").arr.contains("banana").alias("has_banana"),
    $df.col("tags").arr.contains("orange").alias("has_orange")
]).toDicts() as any[];

if (res[0].has_banana !== true) throw new Error("Expected has_banana true");
if (res[0].has_orange !== false) throw new Error("Expected has_orange false");
if (res[1].has_banana !== false) throw new Error("Expected false for empty array");
if (res[2].has_banana !== null) throw new Error("Expected null for null array");

// Dynamic Column Expression as Target
const dfDyn = $df.data([
    { list: [1, 2, 3], target: 2 },
    { list: [1, 2, 3], target: 99 },
    { list: null, target: 2 },
    { list: [1, 2, 3], target: null }
]);
const resDyn = dfDyn.select(
    $df.col("list").arr.contains($df.col("target")).alias("found")
).toDicts() as any[];

if (resDyn[0].found !== true) throw new Error("Expected true for dynamic target 2");
if (resDyn[1].found !== false) throw new Error("Expected false for dynamic target 99");
if (resDyn[2].found !== null) throw new Error("Expected null for null list with dynamic target");
if (resDyn[3].found !== null) throw new Error("Expected null for dynamic target null (Kleene logic)");

// Additional Edge Cases: undefined (Kleene logic), non-array types (primitives/objects), and Float64Array with NaN
const dfEdge = $df.data([
    { arr: [undefined, null, 0], f64: new Float64Array([NaN, 1.5]), bools: [true, false] },
    { arr: [1, 2], f64: new Float64Array([0]), bools: [] },
    { arr: null, f64: { length: 2, 0: 1 }, bools: null }
], { arr: ObjectDataType, f64: ObjectDataType, bools: ObjectDataType });

const resEdge = dfEdge.select([
    $df.col("arr").arr.contains($df.lit(undefined)).alias("has_undefined"),
    $df.col("f64").arr.contains($df.lit(NaN)).alias("f64_has_nan"),
    $df.col("f64").arr.contains($df.lit(1.5)).alias("f64_has_float"),
    $df.col("bools").arr.contains($df.lit(true)).alias("has_true"),
    $df.col("bools").arr.contains($df.lit(false)).alias("has_false")
]).toDicts() as any[];

// When target item is undefined/null, Kleene logic in evalBinaryOp evaluates to null
if (resEdge[0].has_undefined !== null) throw new Error("Expected has_undefined null due to Kleene logic");
if (resEdge[0].f64_has_nan !== true) throw new Error("Expected f64_has_nan true for Float64Array with NaN");
if (resEdge[0].f64_has_float !== true) throw new Error("Expected f64_has_float true");
if (resEdge[0].has_true !== true) throw new Error("Expected has_true true");
if (resEdge[0].has_false !== true) throw new Error("Expected has_false true");

if (resEdge[1].has_undefined !== null) throw new Error("Expected has_undefined null due to Kleene logic");
if (resEdge[1].f64_has_nan !== false) throw new Error("Expected f64_has_nan false");
if (resEdge[1].has_true !== false) throw new Error("Expected has_true false for empty bools");

// Row 2 is non-array values (null, plain object with length property) -> must be null
if (resEdge[2].has_undefined !== null) throw new Error("Expected null for null arr");
if (resEdge[2].f64_has_nan !== null) throw new Error("Expected null for plain object with length property");
if (resEdge[2].has_true !== null) throw new Error("Expected null for null bools");

console.log("✓ ArrayExpr.contains tests passed!");
