declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StructExpr.unnest tests...");

const df = $df.data([
    { s: { a: 1, b: "foo" } },
    { s: { a: 2, b: "bar" } },
    { s: null },
    { s: { a: 3, b: "baz" } }
]);

// 1. unnest() with explicit schema
const schema = {
    s: $df.Struct({
        a: $df.Int32,
        b: $df.Utf8
    })
};
const dfWithSchema = $df.data([
    { s: { a: 1, b: "foo" } },
    { s: { a: 2, b: "bar" } },
    { s: null },
    { s: { a: 3, b: "baz" } }
], schema);

const r6 = dfWithSchema.select([
    $df.col("s").struct.unnest()
]).toDicts() as any[];

if (r6.length !== 4) throw new Error("r6 length mismatch");
if (r6[0].a !== 1 || r6[0].b !== "foo" || "s" in r6[0]) throw new Error("r6 row 0 mismatch");
if (r6[2].a !== null || r6[2].b !== null) throw new Error("r6 row 2 mismatch");

// 2. unnest() without schema (dynamically resolved)
const r7 = df.select([
    $df.col("s").struct.unnest()
]).toDicts() as any[];

if (r7.length !== 4) throw new Error("r7 length mismatch");
if (r7[0].a !== 1 || r7[0].b !== "foo" || "s" in r7[0]) throw new Error("r7 row 0 mismatch");
if (r7[2].a !== null || r7[2].b !== null) throw new Error("r7 row 2 mismatch");

// 3. unnest() inside withColumns
const r8 = df.withColumns([
    $df.col("s").struct.unnest()
]).toDicts() as any[];

if (r8.length !== 4) throw new Error("r8 length mismatch");
if (r8[0].a !== 1 || r8[0].b !== "foo" || !("s" in r8[0])) {
    throw new Error("r8 unnest withColumns failed: " + JSON.stringify(r8[0]));
}

// 4. unnest() when all struct values are null
const dfAllNull = $df.data([
    { s: null },
    { s: null }
], { s: $df.Struct({ a: $df.Int32, b: $df.Utf8 }) });
const rAllNull = dfAllNull.select([
    $df.col("s").struct.unnest()
]).toDicts() as any[];
if (rAllNull[0].a !== null || rAllNull[0].b !== null) throw new Error("Expected nulls for all-null unnest");
if ("s" in rAllNull[0]) throw new Error("Expected 's' removed after unnest in select");

// 5. unnest() on struct with a single field
const dfSingle = $df.data([
    { s: { only: 42 } },
    { s: null }
], { s: $df.Struct({ only: $df.Int32 }) });
const rSingle = dfSingle.select([
    $df.col("s").struct.unnest()
]).toDicts() as any[];
if (rSingle[0].only !== 42) throw new Error("Expected only=42");
if (rSingle[1].only !== null) throw new Error("Expected only=null for null struct");

// 6. unnest() on struct with nested object field (child object is preserved as-is)
const dfNestedObj = $df.data([
    { s: { meta: { x: 1 }, val: 10 } }
], { s: $df.Object });
const rNestedObj = dfNestedObj.select([
    $df.col("s").struct.unnest()
]).toDicts() as any[];
if (typeof rNestedObj[0].meta !== "object" || rNestedObj[0].meta.x !== 1) {
    throw new Error("Expected nested meta object preserved after unnest");
}
if (rNestedObj[0].val !== 10) throw new Error("Expected val=10 after unnest");

// 7. unnest() mixed with literal column in select
const rMixed = df.select([
    $df.col("s").struct.unnest(),
    $df.lit(1).alias("extra")
]).toDicts() as any[];
if (rMixed[0].a !== 1 || rMixed[0].extra !== 1) throw new Error("Expected unnest + lit in same select");

// 8. unnest column-name collision: struct field "a" vs existing sibling column "a"
// In select(), only the struct fields survive — the sibling "a" is not included.
const dfCollision = $df.data([
    { a: 99, s: { a: 1, b: "foo" } },
    { a: 88, s: { a: 2, b: "bar" } }
]);
const rCollision = dfCollision.select([$df.col("s").struct.unnest()]).toDicts() as any[];
if (rCollision[0].a !== 1) throw new Error(`Collision: Expected a=1 from struct, got ${rCollision[0].a}`);
if (rCollision[0].b !== "foo") throw new Error(`Collision: Expected b=foo`);
if ("s" in rCollision[0]) throw new Error(`Collision: Expected s column removed`);

// 9. Full round-trip: unnest → mutate top-level columns → re-pack via withFields
const dfRoundTrip = $df.data([
    { s: { x: 3, y: 4 } },
    { s: { x: 10, y: 0 } }
], { s: $df.Struct({ x: $df.Int32, y: $df.Int32 }) });
const expandedRT = dfRoundTrip.withColumns([$df.col("s").struct.unnest()]);
const repackedRT = expandedRT.withColumns([
    $df.col("s").struct.withFields({
        x: $df.col("x").mul(2),
        y: $df.col("y").add(1)
    }).alias("s")
]).toDicts() as any[];
if (repackedRT[0].s.x !== 6)  throw new Error(`RoundTrip: Expected x=6, got ${repackedRT[0].s.x}`);
if (repackedRT[0].s.y !== 5)  throw new Error(`RoundTrip: Expected y=5, got ${repackedRT[0].s.y}`);
if (repackedRT[1].s.x !== 20) throw new Error(`RoundTrip: Expected x=20, got ${repackedRT[1].s.x}`);
if (repackedRT[1].s.y !== 1)  throw new Error(`RoundTrip: Expected y=1, got ${repackedRT[1].s.y}`);
// Unnested top-level columns still exist alongside the repacked struct
if (repackedRT[0].x !== 3 || repackedRT[0].y !== 4) {
    throw new Error(`RoundTrip: Expected unnested x,y columns preserved alongside struct`);
}

console.log("✓ StructExpr.unnest tests passed!");
