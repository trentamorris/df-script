declare const process: any;
import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION WHEN-THEN-OTHERWISE TESTS...");
console.log("=========================================");

const data = [
    { id: 1, val: 12, category: "A", fallback_val: 100 },
    { id: 2, val: 5, category: "B", fallback_val: 200 },
    { id: 3, val: 8, category: "A", fallback_val: 300 },
    { id: 4, val: null, category: "C", fallback_val: 400 }
];

try {
    const df = $df.data(data);

    // 1. Basic When/Then/Otherwise using with_columns and ColumnExpressions
    const res1 = df.with_columns(
        $df.when($df.col("val").gt(10))
            .then($df.col("category"))
            .otherwise($df.col("fallback_val"))
            .alias("basic_expr"),
        $df.when($df.col("val").lt(6))
            .then($df.col("category"))
            .otherwise($df.col("fallback_val"))
            .alias("basic_expr_other")
    ).to_dicts() as any[];

    console.log("Basic When/Then/Otherwise Results:");
    console.dir(res1, { depth: null });

    // Assert row 0: val=12 (> 10) => "category" ("A")
    if (res1[0].basic_expr !== "A") throw new Error(`res1[0].basic_expr failed, got ${res1[0].basic_expr}`);
    // Assert row 1: val=5 (not > 10) => "fallback_val" ("200")
    if (res1[1].basic_expr !== "200") throw new Error(`res1[1].basic_expr failed, got ${res1[1].basic_expr}`);
    // Assert row 2: val=8 (not > 10) => "fallback_val" ("300")
    if (res1[2].basic_expr !== "300") throw new Error(`res1[2].basic_expr failed, got ${res1[2].basic_expr}`);
    // Assert row 3: val=null (not > 10) => "fallback_val" ("400")
    if (res1[3].basic_expr !== "400") throw new Error(`res1[3].basic_expr failed, got ${res1[3].basic_expr}`);

    // Assert row 1 for basic_expr_other: val=5 (< 6) => "category" ("B")
    if (res1[1].basic_expr_other !== "B") throw new Error(`res1[1].basic_expr_other failed, got ${res1[1].basic_expr_other}`);
    // Assert row 2 for basic_expr_other: val=8 (not < 6) => "fallback_val" ("300")
    if (res1[2].basic_expr_other !== "300") throw new Error(`res1[2].basic_expr_other failed, got ${res1[2].basic_expr_other}`);


    // 2. Chained When/Then/Otherwise using with_columns and Record/Literal Expressions
    const res2 = df.with_columns({
        chained_expr: $df.when($df.col("val").gt(10)).then($df.lit("GT10"))
            .when($df.col("val").gt(6)).then($df.lit("GT6"))
            .otherwise($df.lit("LT_EQ6"))
    }).to_dicts() as any[];

    console.log("Chained When/Then/Otherwise Results:");
    console.dir(res2, { depth: null });

    // Row 0: val=12 => "GT10"
    if (res2[0].chained_expr !== "GT10") throw new Error(`res2[0].chained_expr failed, got ${res2[0].chained_expr}`);
    // Row 1: val=5 => "LT_EQ6"
    if (res2[1].chained_expr !== "LT_EQ6") throw new Error(`res2[1].chained_expr failed, got ${res2[1].chained_expr}`);
    // Row 2: val=8 => "GT6"
    if (res2[2].chained_expr !== "GT6") throw new Error(`res2[2].chained_expr failed, got ${res2[2].chained_expr}`);
    // Row 3: val=null => "LT_EQ6"
    if (res2[3].chained_expr !== "LT_EQ6") throw new Error(`res2[3].chained_expr failed, got ${res2[3].chained_expr}`);


    // 3. Fallback when otherwise() is omitted (should default to null)
    const res3 = df.with_columns(
        $df.when($df.col("val").gt(10))
            .then($df.col("category"))
            .alias("omitted_otherwise")
    ).to_dicts() as any[];

    console.log("Omitted Otherwise Results:");
    console.dir(res3, { depth: null });

    if (res3[0].omitted_otherwise !== "A") throw new Error(`res3[0].omitted_otherwise failed, got ${res3[0].omitted_otherwise}`);
    if (res3[1].omitted_otherwise !== null) throw new Error(`res3[1].omitted_otherwise failed, got ${res3[1].omitted_otherwise}`);
    if (res3[2].omitted_otherwise !== null) throw new Error(`res3[2].omitted_otherwise failed, got ${res3[2].omitted_otherwise}`);


    // 4. Aliasing and Casting (Cloning support)
    const res4 = df.with_columns(
        $df.when($df.col("val").gt(10)).then($df.col("category")).otherwise($df.col("fallback_val"))
            .alias("new_alias"),
        $df.when($df.col("val").gt(10)).then($df.lit(1)).otherwise($df.lit(0))
            .cast($df.DataType.Boolean)
            .alias("cast_bool")
    ).to_dicts() as any[];

    console.log("Aliasing/Casting Results:");
    console.dir(res4, { depth: null });

    if (res4[0].new_alias !== "A") throw new Error(`res4[0].new_alias failed, got ${res4[0].new_alias}`);
    if (res4[0].cast_bool !== true) throw new Error(`res4[0].cast_bool failed, got ${res4[0].cast_bool}`);
    if (res4[1].cast_bool !== false) throw new Error(`res4[1].cast_bool failed, got ${res4[1].cast_bool}`);

    // 5. Object/Record syntax inside select()
    const res5 = df.select({
        basic_expr: $df.when($df.col("val").gt(10))
            .then($df.col("category"))
            .otherwise($df.col("fallback_val"))
    }).to_dicts() as any[];

    console.log("Object/Record syntax inside select() Results:");
    console.dir(res5, { depth: null });

    if (res5[0].basic_expr !== "A") throw new Error(`res5[0].basic_expr failed, got ${res5[0].basic_expr}`);
    if (res5[1].basic_expr !== "200") throw new Error(`res5[1].basic_expr failed, got ${res5[1].basic_expr}`);

    console.log("\n🎉 ALL WHEN-THEN-OTHERWISE TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ WHEN-THEN-OTHERWISE TESTS FAILED:", err);
    process.exit(1);
}
