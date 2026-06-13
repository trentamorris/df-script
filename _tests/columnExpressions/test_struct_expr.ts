import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION STRUCT TESTS...");
console.log("=========================================");

const df = $df.data([
    { s: { a: 1, b: "foo" } },
    { s: { a: 2, b: "bar" } },
    { s: null },
    { s: { a: 3, b: "baz" } }
]);

try {
    // 1. Basic field extraction
    const r1 = df.select([
        $df.col("s").struct.field("a").alias("a_val"),
        $df.col("s").struct.field("b").alias("b_val")
    ]).to_dicts() as any[];
    
    if (r1.length !== 4) throw new Error("r1 length mismatch");
    if (r1[0].a_val !== 1 || r1[0].b_val !== "foo") throw new Error("r1 row 0 mismatch");
    if (r1[1].a_val !== 2 || r1[1].b_val !== "bar") throw new Error("r1 row 1 mismatch");
    if (r1[2].a_val !== null || r1[2].b_val !== null) throw new Error("r1 row 2 mismatch");
    if (r1[3].a_val !== 3 || r1[3].b_val !== "baz") throw new Error("r1 row 3 mismatch");

    // 2. Proxy dot/bracket accessor shorthand
    const r2 = df.select([
        $df.col("s").struct.a.alias("a_val"),
        $df.col("s").struct["b"].alias("b_val")
    ]).to_dicts() as any[];

    if (r2[0].a_val !== 1 || r2[0].b_val !== "foo") throw new Error("r2 row 0 mismatch");
    if (r2[2].a_val !== null || r2[2].b_val !== null) throw new Error("r2 row 2 mismatch");

    // 3. rename_fields
    const r3 = df.select([
        $df.col("s").struct.rename_fields({ a: "a_new", b: "b_new" }).alias("renamed")
    ]).to_dicts() as any[];

    if (r3[0].renamed.a_new !== 1 || r3[0].renamed.b_new !== "foo" || "a" in r3[0].renamed) {
        throw new Error("r3 row 0 mismatch: " + JSON.stringify(r3[0]));
    }
    if (r3[2].renamed !== null) throw new Error("r3 row 2 mismatch");

    // 4. with_fields with array of aliased expressions
    const r4 = df.select([
        $df.col("s").struct.with_fields([
            $df.lit(100).alias("c"),
            $df.col("s").struct.a.mul(10).alias("a")
        ]).alias("updated")
    ]).to_dicts() as any[];

    if (r4[0].updated.c !== 100 || r4[0].updated.a !== 10 || r4[0].updated.b !== "foo") {
        throw new Error("r4 row 0 mismatch: " + JSON.stringify(r4[0]));
    }
    if (r4[2].updated !== null) throw new Error("r4 row 2 mismatch");

    // 5. with_fields with Record object
    const r5 = df.select([
        $df.col("s").struct.with_fields({
            c: $df.lit(200),
            a: $df.col("s").struct.a.mul(20)
        }).alias("updated")
    ]).to_dicts() as any[];

    if (r5[0].updated.c !== 200 || r5[0].updated.a !== 20 || r5[0].updated.b !== "foo") {
        throw new Error("r5 row 0 mismatch: " + JSON.stringify(r5[0]));
    }
    if (r5[2].updated !== null) throw new Error("r5 row 2 mismatch");

    // 6. unnest() with explicit schema
    const schema = {
        s: $df.DataType.Struct({
            a: $df.DataType.Int32,
            b: $df.DataType.Utf8
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
    ]).to_dicts() as any[];

    if (r6.length !== 4) throw new Error("r6 length mismatch");
    if (r6[0].a !== 1 || r6[0].b !== "foo" || "s" in r6[0]) throw new Error("r6 row 0 mismatch");
    if (r6[2].a !== null || r6[2].b !== null) throw new Error("r6 row 2 mismatch");

    // 7. unnest() without schema (dynamically resolved)
    const r7 = df.select([
        $df.col("s").struct.unnest()
    ]).to_dicts() as any[];

    if (r7.length !== 4) throw new Error("r7 length mismatch");
    if (r7[0].a !== 1 || r7[0].b !== "foo" || "s" in r7[0]) throw new Error("r7 row 0 mismatch");
    if (r7[2].a !== null || r7[2].b !== null) throw new Error("r7 row 2 mismatch");

    // 8. unnest() inside with_columns
    const r8 = df.with_columns([
        $df.col("s").struct.unnest()
    ]).to_dicts() as any[];
    
    if (r8.length !== 4) throw new Error("r8 length mismatch");
    if (r8[0].a !== 1 || r8[0].b !== "foo" || !("s" in r8[0])) {
        throw new Error("r8 unnest with_columns failed: " + JSON.stringify(r8[0]));
    }

    console.log("\n🎉 ALL COLUMN EXPRESSION STRUCT TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Column Expression STRUCT TESTS FAILED:", err);
    process.exit(1);
}
