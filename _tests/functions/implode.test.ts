declare const process: any;
import { $df } from "df-script";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION $df.implode() TESTS...");
console.log("=========================================");

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(msg);
}

try {
    const df = $df.dataFrame({
        group: ["A", "A", "B", "B"],
        val: [10, 20, 30, 40]
    });

    // 1. Grouped implode with $df.implode
    const res = df.groupBy("group").agg([
        $df.implode("val").alias("imploded_vals"),
        $df.col("val").implode().alias("method_imploded")
    ]).toDicts();

    if (res.length !== 2) throw new Error("Expected 2 groups");
    const groupA = res.find(r => r.group === "A");
    const groupB = res.find(r => r.group === "B");

    if (!groupA || groupA.imploded_vals[0] !== 10 || groupA.imploded_vals[1] !== 20) {
        throw new Error("Group A implode failed: " + JSON.stringify(groupA));
    }
    if (!groupB || groupB.imploded_vals[0] !== 30 || groupB.imploded_vals[1] !== 40) {
        throw new Error("Group B implode failed: " + JSON.stringify(groupB));
    }

    // 2. Implode with ColumnExpr and array of column names via IntoExprArg
    const res2 = df.groupBy("group").agg([
        $df.implode($df.col("val")).alias("expr_imploded"),
        $df.implode(["val"]).alias("arr_imploded")
    ]).toDicts();
    const groupA2 = res2.find(r => r.group === "A");
    if (!groupA2 || groupA2.expr_imploded[0] !== 10 || groupA2.arr_imploded[1] !== 20) {
        throw new Error("Implode with IntoExprArg variants failed: " + JSON.stringify(groupA2));
    }
    // --- Additional Extreme Edge Cases ---
    (() => {
    const df = $df.dataFrame({
        g: ["A", "A", "B", "C", "C"],
        v: [10, 20, 30, null, 50]
    });

    // 1. Basic groupBy().agg($df.implode("v"))
    const r1 = df.groupBy("g").agg($df.implode("v").alias("list")).sort({ by: "g" }).toDicts() as any[];
    assert(JSON.stringify(r1[0].list) === "[10,20]" && JSON.stringify(r1[1].list) === "[30]", "1: Basic implode failed");

    // 2. Preserves null values inside imploded list
    assert(JSON.stringify(r1[2].list) === "[null,50]", "2: Implode null preservation failed");

    // 3. Implode on negative and zero numbers
    const dfNeg = $df.dataFrame({ g: ["A", "A"], v: [-10, 0] });
    const r3 = dfNeg.groupBy("g").agg($df.implode("v").alias("list")).toDicts() as any[];
    assert(JSON.stringify(r3[0].list) === "[-10,0]", "3: Implode negative/zero failed");

    // 4. Implode on strings
    const dfStr = $df.dataFrame({ g: ["X", "X"], s: ["a", "b"] });
    const r4 = dfStr.groupBy("g").agg($df.implode("s").alias("list")).toDicts() as any[];
    assert(JSON.stringify(r4[0].list) === '["a","b"]', "4: Implode strings failed");

    // 5. Implode on booleans
    const dfBool = $df.dataFrame({ g: ["X", "X"], b: [true, false] });
    const r5 = dfBool.groupBy("g").agg($df.implode("b").alias("list")).toDicts() as any[];
    assert(JSON.stringify(r5[0].list) === "[true,false]", "5: Implode booleans failed");

    // 6. Implode on single-row DataFrame
    const dfSingle = $df.dataFrame({ g: ["only"], v: [99] });
    const r6 = dfSingle.groupBy("g").agg($df.implode("v").alias("list")).toDicts() as any[];
    assert(JSON.stringify(r6[0].list) === "[99]", "6: Single-row implode failed");

    // 7. Implode on 0-row DataFrame
    const dfEmpty = $df.dataFrame({ g: [], v: [] });
    const r7 = dfEmpty.groupBy("g").agg($df.implode("v").alias("list"));
    assert(r7.height === 0 && r7.width === 2, "7: 0-row implode failed");

    // 8. Implode in select() (global aggregation)
    const r8 = dfStr.select($df.implode("s").alias("all_s")).toDicts() as any[];
    assert(JSON.stringify(r8[0].all_s) === '["a","b"]', "8: Global select implode failed");

    // 9. Implode on all-null group
    const dfAllNull = $df.dataFrame({ g: ["N", "N"], v: [null, null] });
    const r9 = dfAllNull.groupBy("g").agg($df.implode("v").alias("list")).toDicts() as any[];
    assert(JSON.stringify(r9[0].list) === "[null,null]", "9: All-null group implode failed");

    // 10. Implode preserves insertion order within group
    const dfOrder = $df.dataFrame({ g: ["A", "A", "A"], v: [3, 1, 2] });
    const r10 = dfOrder.groupBy("g").agg($df.implode("v").alias("list")).toDicts() as any[];
    assert(JSON.stringify(r10[0].list) === "[3,1,2]", "10: Implode order preservation failed");
    })();

    console.log("✓ $df.implode() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.implode() tests failed:", err);
    process.exit(1);
}
