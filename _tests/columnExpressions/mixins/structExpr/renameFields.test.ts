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

// 5. Rename to an already-existing key (overwrite the existing key)
const rSwap = df.select([
    $df.col("s").struct.renameFields({ a: "b" }).alias("renamed")
]).toDicts() as any[];
// "a" is removed; "b" should now hold the original "a" value (1), old "b" ("foo") is also gone
if ("a" in rSwap[0].renamed) throw new Error("Expected 'a' to be removed after rename");

// 6. Rename to the same name (identity rename — no-op in effect)
const rIdentity = df.select([
    $df.col("s").struct.renameFields({ a: "a" }).alias("renamed")
]).toDicts() as any[];
if (rIdentity[0].renamed.a !== 1) throw new Error("Expected identity rename to preserve value");

// 7. Struct with nested object value — rename operates on top-level keys only
const dfNested = $df.data([
    { s: { outer: { inner: 42 }, x: 1 } }
], { s: $df.Object });
const rNestedRename = dfNested.select([
    $df.col("s").struct.renameFields({ outer: "renamed_outer" }).alias("s")
]).toDicts() as any[];
if (!("renamed_outer" in rNestedRename[0].s)) throw new Error("Expected renamed_outer in result");
if (typeof rNestedRename[0].s.renamed_outer !== "object") throw new Error("Expected nested object preserved");
if (rNestedRename[0].s.renamed_outer.inner !== 42) throw new Error("Expected inner value preserved");

// 8. renameFields then unnest — renamed field names must appear as columns
// Previously buggy: schema path returned stale pre-rename names after unnest.
const dfRenameUnnest = $df.data([
    { s: { a: 100, b: 200 } },
    { s: null }
], { s: $df.Struct({ a: $df.Int32, b: $df.Int32 }) });
const rRenameUnnest = dfRenameUnnest.select([
    $df.col("s").struct.renameFields({ a: "renamed_a" }).struct.unnest()
]).toDicts() as any[];
if (!("renamed_a" in rRenameUnnest[0])) throw new Error("Expected renamed_a column after rename+unnest");
if ("a" in rRenameUnnest[0]) throw new Error("Expected old 'a' absent after rename+unnest");
if (rRenameUnnest[0].renamed_a !== 100) throw new Error(`Expected renamed_a=100, got ${rRenameUnnest[0].renamed_a}`);
if (rRenameUnnest[1].renamed_a !== null) throw new Error("Expected null for null struct after rename+unnest");

// 9. Edge case: struct with undefined/null property values preserved correctly
const dfNullProps = $df.data([
    { s: { x: null, y: undefined, z: 0, w: false } }
], { s: $df.Object });
const rNullProps = dfNullProps.select([
    $df.col("s").struct.renameFields({ x: "x_new", y: "y_new", z: "z_new", w: "w_new" }).alias("s_new")
]).toDicts() as any[];
if (rNullProps[0].s_new.x_new !== null) throw new Error("Expected null preserved across rename");
if (rNullProps[0].s_new.y_new !== undefined) throw new Error("Expected undefined preserved across rename");
if (rNullProps[0].s_new.z_new !== 0) throw new Error("Expected 0 preserved across rename");
if (rNullProps[0].s_new.w_new !== false) throw new Error("Expected false preserved across rename");

// 10. Edge case: empty object `{}` struct rename
const dfEmptyStruct = $df.data([{ s: {} }], { s: $df.Object });
const rEmptyStruct = dfEmptyStruct.select([
    $df.col("s").struct.renameFields({ a: "b" }).alias("s")
]).toDicts() as any[];
if (Object.keys(rEmptyStruct[0].s).length !== 0) throw new Error("Expected empty struct after rename on empty object");

// 11. Edge case: multiple fields renamed simultaneously
const dfMulti = $df.data([{ s: { a: 1, b: 2, c: 3, d: 4 } }]);
const rMulti = dfMulti.select([
    $df.col("s").struct.renameFields({ a: "alpha", b: "beta", c: "gamma" }).alias("s")
]).toDicts() as any[];
if (rMulti[0].s.alpha !== 1 || rMulti[0].s.beta !== 2 || rMulti[0].s.gamma !== 3 || rMulti[0].s.d !== 4) {
    throw new Error("Expected multi-field rename to succeed");
}
if ("a" in rMulti[0].s || "b" in rMulti[0].s || "c" in rMulti[0].s) {
    throw new Error("Old keys must not remain in multi-field rename");
}

console.log("✓ StructExpr.renameFields tests passed!");

