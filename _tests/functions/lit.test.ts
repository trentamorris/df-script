declare const process: any;
import { $df } from "df-script";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION $df.lit() TESTS...");
console.log("=========================================");

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(msg);
}

try {
    const df = $df.dataFrame({
        id: [1, 2]
    });

    // 1. Literal scalar types with withColumns
    const res = df.withColumns(
        $df.lit("constant_string").alias("lit_str"),
        $df.lit(42).alias("lit_num"),
        $df.lit([1, 2]).alias("lit_arr"),
        $df.lit(123, { dtype: $df.Int32, name: "lit_int32" })
    ).toDicts();

    if (res.length !== 2) throw new Error("Length mismatch");
    if (res[0].lit_str !== "constant_string" || res[0].lit_num !== 42) {
        throw new Error("Lit row 0 failed: " + JSON.stringify(res[0]));
    }
    if (res[1].lit_int32 !== 123 || res[1].lit_arr[0] !== 1) {
        throw new Error("Lit row 1 failed: " + JSON.stringify(res[1]));
    }
    // --- Additional Extreme Edge Cases ---
    (() => {
    const df = $df.dataFrame({ a: [1, 2, 3] });

    // 1. Literal number
    const r1 = df.select($df.lit(42).alias("n")).toDicts() as any[];
    assert(r1.length >= 1 && r1.every(r => r.n === 42), "1: Literal number failed");

    // 2. Literal string
    const r2 = df.select($df.lit("ok").alias("s")).toDicts() as any[];
    assert(r2.every(r => r.s === "ok"), "2: Literal string failed");

    // 3. Literal boolean (false)
    const r3 = df.select($df.lit(false).alias("b")).toDicts() as any[];
    assert(r3.every(r => r.b === false), "3: Literal false failed");

    // 4. Literal zero
    const r4 = df.select($df.lit(0).alias("z")).toDicts() as any[];
    assert(r4.every(r => r.z === 0), "4: Literal 0 failed");

    // 5. Literal empty string
    const r5 = df.select($df.lit("").alias("e")).toDicts() as any[];
    assert(r5.every(r => r.e === ""), "5: Literal empty string failed");

    // 6. Literal null
    const r6 = df.select($df.lit(null).alias("nu")).toDicts() as any[];
    assert(r6.every(r => r.nu === null), "6: Literal null failed");

    // 7. Literal NaN
    const r7 = df.select($df.lit(NaN).alias("nan")).toDicts() as any[];
    assert(r7.every(r => Number.isNaN(r.nan)), "7: Literal NaN failed");

    // 8. Literal used in arithmetic expression ($df.col("a").add($df.lit(10)))
    const r8 = df.select($df.col("a").add($df.lit(10)).alias("sum")).toDicts() as any[];
    assert(r8[0].sum === 11 && r8[2].sum === 13, "8: Literal in arithmetic failed");

    // 9. Literal on 0-row DataFrame with withColumns
    const dfEmpty = $df.dataFrame({ a: [] });
    const r9 = dfEmpty.withColumns($df.lit(99).alias("n"));
    assert(r9.height === 0 && r9.width === 2, "9: Literal on 0-row DF failed");

    // 10. Literal in withColumns()
    const r10 = df.withColumns($df.lit("active").alias("status")).toDicts() as any[];
    assert(r10.length === 3 && r10[1].a === 2 && r10[1].status === "active", "10: Literal in withColumns failed");
    })();

    console.log("✓ $df.lit() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.lit() tests failed:", err);
    process.exit(1);
}
