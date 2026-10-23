declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StructExpr.field tests...");

const df = $df.data([
    { s: { a: 1, b: "foo" } },
    { s: { a: 2, b: "bar" } },
    { s: null },
    { s: { a: 3, b: "baz" } }
]);

// 1. Basic field extraction
const r1 = df.select([
    $df.col("s").struct.field("a").alias("a_val"),
    $df.col("s").struct.field("b").alias("b_val")
]).toDicts() as any[];

if (r1.length !== 4) throw new Error("r1 length mismatch");
if (r1[0].a_val !== 1 || r1[0].b_val !== "foo") throw new Error("r1 row 0 mismatch");
if (r1[1].a_val !== 2 || r1[1].b_val !== "bar") throw new Error("r1 row 1 mismatch");
if (r1[2].a_val !== null || r1[2].b_val !== null) throw new Error("r1 row 2 mismatch");
if (r1[3].a_val !== 3 || r1[3].b_val !== "baz") throw new Error("r1 row 3 mismatch");

// 2. Proxy dot/bracket accessor shorthand
const r2 = df.select([
    $df.col("s").struct.a.alias("a_val"),
    $df.col("s").struct["b"].alias("b_val")
]).toDicts() as any[];

if (r2[0].a_val !== 1 || r2[0].b_val !== "foo") throw new Error("r2 row 0 mismatch");
if (r2[2].a_val !== null || r2[2].b_val !== null) throw new Error("r2 row 2 mismatch");

// 3. Non-existent field returns undefined/null
const rNonExistent = df.select([
    $df.col("s").struct.field("non_existent").alias("missing")
]).toDicts() as any[];
if (rNonExistent[0].missing !== null) throw new Error("Expected null for missing field on object");
if (rNonExistent[2].missing !== null) throw new Error("Expected null for missing field on null object");

// 4. Primitive / non-object column values evaluate to null
const dfPrimitives = $df.data([
    { s: 123 },
    { s: "string_val" },
    { s: true },
    { s: {} }
], { s: $df.Object });
const rPrim = dfPrimitives.select([
    $df.col("s").struct.field("a").alias("a_val")
]).toDicts() as any[];
if (rPrim[0].a_val !== null) throw new Error("Expected null for number primitive");
if (rPrim[1].a_val !== null) throw new Error("Expected null for string primitive");
if (rPrim[2].a_val !== null) throw new Error("Expected null for boolean primitive");
if (rPrim[3].a_val !== null) throw new Error("Expected null for empty struct");

// 5. Nested structs extraction
const dfNested = $df.data([
    { s: { nested: { x: 42 } } },
    { s: { nested: null } },
    { s: null }
], { s: $df.Object });
const rNested = dfNested.select([
    $df.col("s").struct.nested.struct.x.alias("x_val")
]).toDicts() as any[];
if (rNested[0].x_val !== 42) throw new Error("Expected 42 for nested struct field");
if (rNested[1].x_val !== null) throw new Error("Expected null for nested null struct");
if (rNested[2].x_val !== null) throw new Error("Expected null for outer null struct");

// 6. Falsy-but-valid values (0, false, "") inside struct are preserved
const dfFalsy = $df.data([
    { s: { x: 0, y: false, z: "" } },
    { s: { x: -1, y: true, z: "ok" } }
], { s: $df.Object });
const rFalsy = dfFalsy.select([
    $df.col("s").struct.field("x").alias("x"),
    $df.col("s").struct.field("y").alias("y"),
    $df.col("s").struct.field("z").alias("z"),
]).toDicts() as any[];
if (rFalsy[0].x !== 0) throw new Error("Expected 0 for falsy int");
if (rFalsy[0].y !== false) throw new Error("Expected false for falsy bool");
if (rFalsy[0].z !== "") throw new Error("Expected '' for falsy string");

// 7. Struct field holding an array value
const dfArrField = $df.data([
    { s: { tags: [1, 2, 3] } },
    { s: { tags: [] } },
    { s: null }
], { s: $df.Object });
const rArrField = dfArrField.select([
    $df.col("s").struct.field("tags").alias("tags")
]).toDicts() as any[];
if (!Array.isArray(rArrField[0].tags) || rArrField[0].tags.length !== 3) {
    throw new Error("Expected array field [1,2,3]");
}
if (!Array.isArray(rArrField[1].tags) || rArrField[1].tags.length !== 0) {
    throw new Error("Expected empty array field");
}
if (rArrField[2].tags !== null) throw new Error("Expected null for null struct");

// 8. field() used inside withColumns (keeps sibling columns)
const rWithCols = df.withColumns([
    $df.col("s").struct.field("a").alias("a_val")
]).toDicts() as any[];
if (!("s" in rWithCols[0])) throw new Error("Expected 's' column preserved in withColumns");
if (rWithCols[0].a_val !== 1) throw new Error("Expected a_val=1 in withColumns");
if (rWithCols[2].a_val !== null) throw new Error("Expected null for null struct row in withColumns");

// 9. Non-object with array type should return null
const dfArr = $df.data([{ s: [1, 2, 3] }], { s: $df.Object });
const rArr = dfArr.select([$df.col("s").struct.field("0").alias("v")]).toDicts() as any[];
// Arrays are objects in JS — field "0" should still resolve
if (rArr[0].v === undefined) throw new Error("Expected array index field to resolve");

// 10. Triple-chained mutations: renameFields → withFields → field()
// Rename "a"→"x", add "y" derived from original "a", then extract "y".
const dfChain = $df.data([
    { s: { a: 5, b: "hi" } },
    { s: { a: 10, b: "there" } },
    { s: null }
]);
const rChain = dfChain.withColumns([
    $df.col("s").struct
        .renameFields({ a: "x" })
        .struct.withFields({ y: $df.col("s").struct.a.mul(3) })
        .struct.field("y")
        .alias("y")
]).toDicts() as any[];
if (rChain[0].y !== 15) throw new Error(`Chain: Expected y=15, got ${rChain[0].y}`);
if (rChain[1].y !== 30) throw new Error(`Chain: Expected y=30, got ${rChain[1].y}`);
if (rChain[2].y !== null) throw new Error(`Chain: Expected y=null for null struct`);

// 11. sort() by struct field extracted via field() — integration with DataFrame sort
const dfSort = $df.data([
    { s: { score: 30 } },
    { s: { score: 10 } },
    { s: null },
    { s: { score: 20 } }
]);
const rSort = dfSort.withColumns([
    $df.col("s").struct.field("score").alias("score")
]).sort({ by: "score", descending: false, nullsLast: true }).toDicts() as any[];
if (rSort[0].score !== 10) throw new Error(`Sort: Expected first score=10, got ${rSort[0].score}`);
if (rSort[1].score !== 20) throw new Error(`Sort: Expected second score=20`);
if (rSort[2].score !== 30) throw new Error(`Sort: Expected third score=30`);
if (rSort[3].score !== null) throw new Error(`Sort: Expected last score=null`);

// 12. Prototype-safe field access: key "constructor" must return own property, not prototype
const dfProto = $df.data([
    { s: { normal: 42 } },
    { s: { constructor: "hacked" } }
], { s: $df.Object });
const rProto = dfProto.select([
    $df.col("s").struct.field("constructor").alias("ctor")
]).toDicts() as any[];
if (rProto[1].ctor !== "hacked") throw new Error(`Proto: Expected own 'constructor' property returned`);

// 13. field() returning undefined/null propagates into further arithmetic
const dfNullProp = $df.data([
    { s: { a: 5 } },
    { s: { b: 99 } },
    { s: null }
], { s: $df.Object });
const rNullProp = dfNullProp.select([
    $df.col("s").struct.field("a").mul(10).alias("result")
]).toDicts() as any[];
if (rNullProp[0].result !== 50) throw new Error(`NullProp: Expected result=50, got ${rNullProp[0].result}`);
if (rNullProp[1].result !== null) throw new Error(`NullProp: Expected null for missing field * 10`);
if (rNullProp[2].result !== null) throw new Error(`NullProp: Expected null for null struct * 10`);

// 14. Edge case: field extraction from primitive non-objects returns null
const dfNonObj = $df.data([
    { s: "hello" },
    { s: 123 },
    { s: true },
    { s: undefined }
], { s: $df.Object });
const rNonObj = dfNonObj.select([
    $df.col("s").struct.field("a").alias("res_field"),
    $df.col("s").struct.a.alias("res_proxy")
]).toDicts() as any[];
for (let i = 0; i < 4; i++) {
    if (rNonObj[i].res_field !== null) throw new Error(`Expected null res_field on row ${i}`);
    if (rNonObj[i].res_proxy !== null) throw new Error(`Expected null res_proxy on row ${i}`);
}

// 15. Edge case: struct field with falsy boolean and 0 values
const dfFalsyValues = $df.data([
    { s: { flag: false, count: 0, str: "", empty: null } }
], { s: $df.Object });
const rFalsyValues = dfFalsyValues.select([
    $df.col("s").struct.flag.alias("flag"),
    $df.col("s").struct.count.alias("count"),
    $df.col("s").struct.str.alias("str"),
    $df.col("s").struct.empty.alias("empty")
]).toDicts() as any[];
if (rFalsyValues[0].flag !== false) throw new Error("Expected false preserved");
if (rFalsyValues[0].count !== 0) throw new Error("Expected 0 preserved");
if (rFalsyValues[0].str !== "") throw new Error("Expected empty string preserved");
if (rFalsyValues[0].empty !== null) throw new Error("Expected null preserved");

console.log("✓ StructExpr.field tests passed!");

