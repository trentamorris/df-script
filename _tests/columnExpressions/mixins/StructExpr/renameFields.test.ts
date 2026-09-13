declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StructExpr.renameFields tests...");

const df = $df.data([
    { s: { a: 1, b: "foo" } },
    { s: { a: 2, b: "bar" } },
    { s: null },
    { s: { a: 3, b: "baz" } }
]);

const r3 = df.select([
    $df.col("s").struct.renameFields({ a: "a_new", b: "b_new" }).alias("renamed")
]).toDicts() as any[];

if (r3[0].renamed.a_new !== 1 || r3[0].renamed.b_new !== "foo" || "a" in r3[0].renamed) {
    throw new Error("r3 row 0 mismatch: " + JSON.stringify(r3[0]));
}
if (r3[2].renamed !== null) throw new Error("r3 row 2 mismatch");

// 2. Empty mapping keeps existing fields untouched
const rEmptyMap = df.select([
    $df.col("s").struct.renameFields({}).alias("renamed")
]).toDicts() as any[];
if (rEmptyMap[0].renamed.a !== 1 || rEmptyMap[0].renamed.b !== "foo") {
    throw new Error("Expected fields preserved with empty mapping");
}

// 3. Mapping keys that don't exist in the struct
const rNonExistentKey = df.select([
    $df.col("s").struct.renameFields({ non_existent: "never_added" }).alias("renamed")
]).toDicts() as any[];
if ("never_added" in rNonExistentKey[0].renamed || rNonExistentKey[0].renamed.a !== 1) {
    throw new Error("Expected unmapped nonexistent keys to be ignored");
}

// 4. Primitive / non-object values evaluate to null
const dfPrimitives = $df.data([
    { s: 123 },
    { s: "string_val" },
    { s: true }
], { s: $df.Object });
const rPrim = dfPrimitives.select([
    $df.col("s").struct.renameFields({ a: "a_new" }).alias("renamed")
]).toDicts() as any[];
if (rPrim[0].renamed !== null || rPrim[1].renamed !== null || rPrim[2].renamed !== null) {
    throw new Error("Expected null for primitives");
}

console.log("✓ StructExpr.renameFields tests passed!");
