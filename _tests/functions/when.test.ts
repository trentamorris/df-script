declare const process: any;
import { $df, ColumnExpr } from "../../src/index";

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

    // 1. Basic When/Then/Otherwise using withColumns and ColumnExpressions
    const res1 = df.withColumns(
        $df.when($df.col("val").gt(10))
            .then($df.col("category"))
            .otherwise($df.col("fallback_val"))
            .alias("basic_expr"),
        $df.when($df.col("val").lt(6))
            .then($df.col("category"))
            .otherwise($df.col("fallback_val"))
            .alias("basic_expr_other")
    ).toDicts() as any[];

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


    // 2. Chained When/Then/Otherwise using withColumns and Record/Literal Expressions
    const res2 = df.withColumns({
        chained_expr: $df.when($df.col("val").gt(10)).then($df.lit("GT10"))
            .when($df.col("val").gt(6)).then($df.lit("GT6"))
            .otherwise($df.lit("LT_EQ6"))
    }).toDicts() as any[];

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
    const res3 = df.withColumns(
        $df.when($df.col("val").gt(10))
            .then($df.col("category"))
            .alias("omitted_otherwise")
    ).toDicts() as any[];

    console.log("Omitted Otherwise Results:");
    console.dir(res3, { depth: null });

    if (res3[0].omitted_otherwise !== "A") throw new Error(`res3[0].omitted_otherwise failed, got ${res3[0].omitted_otherwise}`);
    if (res3[1].omitted_otherwise !== null) throw new Error(`res3[1].omitted_otherwise failed, got ${res3[1].omitted_otherwise}`);
    if (res3[2].omitted_otherwise !== null) throw new Error(`res3[2].omitted_otherwise failed, got ${res3[2].omitted_otherwise}`);


    // 4. Aliasing and Casting (Cloning support)
    const res4 = df.withColumns(
        $df.when($df.col("val").gt(10)).then($df.col("category")).otherwise($df.col("fallback_val"))
            .alias("new_alias"),
        $df.when($df.col("val").gt(10)).then($df.lit(1)).otherwise($df.lit(0))
            .cast($df.Boolean)
            .alias("cast_bool")
    ).toDicts() as any[];

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
    }).toDicts() as any[];

    console.log("Object/Record syntax inside select() Results:");
    console.dir(res5, { depth: null });

    if (res5[0].basic_expr !== "A") throw new Error(`res5[0].basic_expr failed, got ${res5[0].basic_expr}`);
    if (res5[1].basic_expr !== "200") throw new Error(`res5[1].basic_expr failed, got ${res5[1].basic_expr}`);

    // 6. String column name predicates and string column outputs
    const dfStringCol = $df.data({
        is_promo: [true, false, true, false],
        code_a: ["P1", "P2", "P3", "P4"],
        code_b: ["STD1", "STD2", "STD3", "STD4"]
    });
    const res6 = dfStringCol.withColumns(
        $df.when("is_promo").then("code_a").otherwise("code_b").alias("active_code"),
        $df.when("is_promo").then("PREMIUM").otherwise("STANDARD").alias("tier")
    ).toDicts() as any[];

    if (res6[0].active_code !== "P1" || res6[0].tier !== "PREMIUM") throw new Error("res6[0] failed");
    if (res6[1].active_code !== "STD2" || res6[1].tier !== "STANDARD") throw new Error("res6[1] failed");

    // 7. Non-boolean predicate values (truthiness vs strict boolean true check)
    const dfTruthy = $df.data({
        num_flag: [1, 0, null, 2],
        str_flag: ["true", "", "yes", null]
    });
    const res7 = dfTruthy.withColumns(
        $df.when($df.col("num_flag").eq(1)).then("is_one").otherwise("not_one").alias("one_check"),
        $df.when($df.col("str_flag").isNotNull()).then("has_str").otherwise("no_str").alias("null_check")
    ).toDicts() as any[];

    if (res7[0].one_check !== "is_one") throw new Error("res7[0].one_check failed");
    if (res7[1].one_check !== "not_one") throw new Error("res7[1].one_check failed");
    if (res7[2].one_check !== "not_one") throw new Error("res7[2].one_check failed");
    if (res7[0].null_check !== "has_str") throw new Error("res7[0].null_check failed");
    if (res7[3].null_check !== "no_str") throw new Error("res7[3].null_check failed");

    // 8. Nested when/then/otherwise expressions
    const res8 = df.withColumns(
        $df.when($df.col("category").eq("A"))
            .then($df.when($df.col("val").gt(10)).then("A_HIGH").otherwise("A_LOW"))
            .otherwise(
                $df.when($df.col("category").eq("B")).then("B_VAL").otherwise("OTHER")
            )
            .alias("nested_grade")
    ).toDicts() as any[];

    if (res8[0].nested_grade !== "A_HIGH") throw new Error(`res8[0].nested_grade failed, got ${res8[0].nested_grade}`);
    if (res8[1].nested_grade !== "B_VAL") throw new Error(`res8[1].nested_grade failed, got ${res8[1].nested_grade}`);
    if (res8[2].nested_grade !== "A_LOW") throw new Error(`res8[2].nested_grade failed, got ${res8[2].nested_grade}`);
    if (res8[3].nested_grade !== "OTHER") throw new Error(`res8[3].nested_grade failed, got ${res8[3].nested_grade}`);

    // 9. Empty DataFrame edge case
    const emptyDf = $df.data({ val: [] as number[], cat: [] as string[] });
    const res9 = emptyDf.withColumns(
        $df.when($df.col("val").gt(0)).then("POS").otherwise("NON_POS").alias("status")
    );
    if (res9.height !== 0 || !("status" in res9.schema)) {
        throw new Error("res9 empty DataFrame failed");
    }

    // 10. Multi-branch chaining with 5 branches (first match precedence)
    const res10 = $df.data({ val: [10, 20, 30, 40, 50, 60] }).withColumns(
        $df.when($df.col("val").eq(10)).then("T10")
            .when($df.col("val").eq(20)).then("T20")
            .when($df.col("val").eq(30)).then("T30")
            .when($df.col("val").eq(40)).then("T40")
            .when($df.col("val").eq(50)).then("T50")
            .otherwise("T_OTHER")
            .alias("bracket")
    ).toDicts() as any[];

    if (res10[0].bracket !== "T10") throw new Error("res10[0] failed");
    if (res10[1].bracket !== "T20") throw new Error("res10[1] failed");
    if (res10[2].bracket !== "T30") throw new Error("res10[2] failed");
    if (res10[3].bracket !== "T40") throw new Error("res10[3] failed");
    if (res10[4].bracket !== "T50") throw new Error("res10[4] failed");
    if (res10[5].bracket !== "T_OTHER") throw new Error("res10[5] failed");

    // 11. TypedArray and Array outputs in then/otherwise
    const res11 = $df.data({ flag: [true, false] }).withColumns(
        $df.when($df.col("flag")).then(new Uint8Array([1, 2])).otherwise(new Uint8Array([3, 4])).alias("bin_data"),
        $df.when($df.col("flag")).then($df.lit([10, 20])).otherwise($df.lit([30, 40])).alias("list_data")
    ).toDicts() as any[];

    if (!(res11[0].bin_data instanceof Uint8Array) || res11[0].bin_data[0] !== 1) throw new Error("res11[0].bin_data failed");
    if (!(res11[1].bin_data instanceof Uint8Array) || res11[1].bin_data[0] !== 3) throw new Error("res11[1].bin_data failed");
    if (!Array.isArray(res11[0].list_data) || res11[0].list_data[0] !== 10) throw new Error("res11[0].list_data failed");
    if (!Array.isArray(res11[1].list_data) || res11[1].list_data[0] !== 30) throw new Error("res11[1].list_data failed");

    // 12. Direct When class and WhenThen export checks
    const whenChain = $df.when(true);
    if (typeof whenChain.then !== "function") throw new Error("whenChain.then should be a function");
    const whenThenObj = whenChain.then("val");
    if (!(whenThenObj instanceof ColumnExpr)) throw new Error("whenThenObj should be an instance of ColumnExpr");
    if (whenThenObj._branchOperands.length !== 1 || whenThenObj._branchOperands[0] !== "val") throw new Error("whenThenObj._branchOperands mismatch");

    // 13. Literal / scalar boolean predicate without column expressions
    const res12 = df.withColumns(
        $df.when(true).then("ALWAYS_TRUE").otherwise("NEVER").alias("const_true"),
        $df.when(false).then("NEVER").otherwise("ALWAYS_FALSE").alias("const_false")
    ).toDicts() as any[];

    if (res12[0].const_true !== "ALWAYS_TRUE" || res12[1].const_true !== "ALWAYS_TRUE") throw new Error("res12 const_true failed");
    if (res12[0].const_false !== "ALWAYS_FALSE" || res12[1].const_false !== "ALWAYS_FALSE") throw new Error("res12 const_false failed");

    // 14. Null and undefined predicate handling (should evaluate to false and hit otherwise)
    const res13 = df.withColumns(
        $df.when(null as any).then("HIT_NULL").otherwise("MISSED_NULL").alias("null_pred"),
        $df.when(undefined as any).then("HIT_UNDEF").otherwise("MISSED_UNDEF").alias("undef_pred")
    ).toDicts() as any[];

    if (res13[0].null_pred !== "MISSED_NULL") throw new Error("res13 null_pred failed");
    if (res13[0].undef_pred !== "MISSED_UNDEF") throw new Error("res13 undef_pred failed");

    // 15. Complex nested object and null values in then/otherwise branches
    const objA = { key: "A" };
    const objB = { key: "B" };
    const res14 = df.withColumns(
        $df.when($df.col("id").eq(1)).then(objA).otherwise(objB).alias("obj_branch"),
        $df.when($df.col("id").eq(1)).then(null).otherwise("not_null").alias("null_then_branch")
    ).toDicts() as any[];

    if (res14[0].obj_branch !== objA || res14[1].obj_branch !== objB) throw new Error("res14 obj_branch failed");
    if (res14[0].null_then_branch !== null || res14[1].null_then_branch !== "not_null") throw new Error("res14 null_then_branch failed");

    // 16. _branchOperands with otherwise vs without otherwise
    const withOtherwise = $df.when($df.col("id").eq(1)).then("A").when($df.col("id").eq(2)).then("B").otherwise("C");
    if (withOtherwise._branchOperands.length !== 3 || withOtherwise._branchOperands[2] !== "C") {
        throw new Error("withOtherwise._branchOperands failed");
    }
    const withoutOtherwise = $df.when($df.col("id").eq(1)).then("A").when($df.col("id").eq(2)).then("B");
    if (withoutOtherwise._branchOperands.length !== 2 || withoutOtherwise._branchOperands[1] !== "B") {
        throw new Error("withoutOtherwise._branchOperands failed");
    }

    console.log("\n🎉 ALL WHEN-THEN-OTHERWISE TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ WHEN-THEN-OTHERWISE TESTS FAILED:", err);
    process.exit(1);
}


