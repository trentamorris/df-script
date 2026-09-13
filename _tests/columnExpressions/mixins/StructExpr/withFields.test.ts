declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StructExpr.withFields tests...");

const df = $df.data([
    { s: { a: 1, b: "foo" } },
    { s: { a: 2, b: "bar" } },
    { s: null },
    { s: { a: 3, b: "baz" } }
]);

// 1. withFields with array of aliased expressions
const r4 = df.select([
    $df.col("s").struct.withFields([
        $df.lit(100).alias("c"),
        $df.col("s").struct.a.mul(10).alias("a")
    ]).alias("updated")
]).toDicts() as any[];

if (r4[0].updated.c !== 100 || r4[0].updated.a !== 10 || r4[0].updated.b !== "foo") {
    throw new Error("r4 row 0 mismatch: " + JSON.stringify(r4[0]));
}
if (r4[2].updated !== null) throw new Error("r4 row 2 mismatch");

// 2. withFields with Record object
const r5 = df.select([
    $df.col("s").struct.withFields({
        c: $df.lit(200),
        a: $df.col("s").struct.a.mul(20)
    }).alias("updated")
]).toDicts() as any[];

if (r5[0].updated.c !== 200 || r5[0].updated.a !== 20 || r5[0].updated.b !== "foo") {
    throw new Error("r5 row 0 mismatch: " + JSON.stringify(r5[0]));
}
if (r5[2].updated !== null) throw new Error("r5 row 2 mismatch");

// 3. Error when expression in array lacks alias/name
let threw = false;
try {
    df.select([
        $df.col("s").struct.withFields([$df.lit(42)])
    ]).toDicts();
} catch (e: any) {
    threw = true;
}
if (!threw) throw new Error("Expected withFields to throw when expression lacks alias");

// 4. Empty fields object or array keeps object unchanged
const rEmpty = df.select([
    $df.col("s").struct.withFields({}).alias("updated")
]).toDicts() as any[];
if (rEmpty[0].updated.a !== 1 || rEmpty[0].updated.b !== "foo") {
    throw new Error("Expected object preserved when withFields({}) is called");
}

// 5. Primitive / non-object column values evaluate to null
const dfPrimitives = $df.data([
    { s: 123 },
    { s: "string_val" }
], { s: $df.Object });
const rPrim = dfPrimitives.select([
    $df.col("s").struct.withFields({ x: $df.lit(1) }).alias("updated")
]).toDicts() as any[];
if (rPrim[0].updated !== null || rPrim[1].updated !== null) {
    throw new Error("Expected null for primitives");
}

console.log("✓ StructExpr.withFields tests passed!");
