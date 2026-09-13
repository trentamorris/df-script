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

console.log("✓ StructExpr.field tests passed!");
