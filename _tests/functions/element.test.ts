declare const process: any;
import { $df } from "df-script";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION $df.element() TESTS...");
console.log("=========================================");

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(msg);
}

try {
    const df = $df.dataFrame({
        list_col: [[1, 2, null, 4], [null, 10, 20]]
    });

    // 1. Array filter using $df.element()
    const filtered = df.select([
        $df.col("list_col").arr.filter($df.element().isNotNull()).alias("clean_list")
    ]).toDicts();

    if (filtered[0].clean_list.length !== 3 || filtered[0].clean_list.includes(null)) {
        throw new Error("Element filter row 0 failed: " + JSON.stringify(filtered[0]));
    }
    if (filtered[1].clean_list.length !== 2 || filtered[1].clean_list.includes(null)) {
        throw new Error("Element filter row 1 failed: " + JSON.stringify(filtered[1]));
    }
    // --- Additional Extreme Edge Cases ---
    (() => {
    const df = $df.dataFrame({
        arr: [[1, 2, 3], [4, 5], [], null]
    });

    // 1. arr.filter with $df.element().gt(2)
    const r1 = df.select($df.col("arr").arr.filter($df.element<number>().gt(2)).alias("out")).toDicts() as any[];
    assert(JSON.stringify(r1[0].out) === "[3]" && JSON.stringify(r1[1].out) === "[4,5]", "1: arr.filter failed");

    // 2. Empty array cell in arr.filter stays empty array
    assert(JSON.stringify(r1[2].out) === "[]", "2: Empty array cell should stay []");

    // 3. Null array cell in arr.filter stays null
    assert(r1[3].out === null, "3: Null array cell should stay null");

    // 4. arr.eval with arithmetic expression
    const r4 = df.select($df.col("arr").arr.eval($df.element<number>().mul(10)).alias("out")).toDicts() as any[];
    assert(JSON.stringify(r4[0].out) === "[10,20,30]" && JSON.stringify(r4[1].out) === "[40,50]", "4: arr.eval failed");

    // 5. arr.eval with chained expression (add + mul)
    const r5 = df.select($df.col("arr").arr.eval($df.element<number>().add(1).mul(2)).alias("out")).toDicts() as any[];
    assert(JSON.stringify(r5[0].out) === "[4,6,8]", "5: Chained arr.eval failed");

    // 6. String elements with .str namespace
    const dfStr = $df.dataFrame({ words: [["hello", "world"], ["foo"]] });
    const r6 = dfStr.select($df.col("words").arr.eval($df.element<string>().str.toUpperCase()).alias("out")).toDicts() as any[];
    assert(JSON.stringify(r6[0].out) === '["HELLO","WORLD"]', "6: String element .str.toUppercase failed");

    // 7. Filtering out all elements returns []
    const r7 = df.select($df.col("arr").arr.filter($df.element<number>().gt(100)).alias("out")).toDicts() as any[];
    assert(JSON.stringify(r7[0].out) === "[]", "7: Filter all out should return []");

    // 8. Compound boolean predicate with $df.element()
    const r8 = df.select(
        $df.col("arr").arr.filter($df.element<number>().gt(1).and($df.element<number>().lt(5))).alias("out")
    ).toDicts() as any[];
    assert(JSON.stringify(r8[0].out) === "[2,3]" && JSON.stringify(r8[1].out) === "[4]", "8: Compound predicate failed");

    // 9. Array containing null elements
    const dfWithNulls = $df.dataFrame({ arr: [[1, null, 3]] });
    const r9 = dfWithNulls.select($df.col("arr").arr.filter($df.element().isNotNull()).alias("out")).toDicts() as any[];
    assert(JSON.stringify(r9[0].out) === "[1,3]", "9: Filter null elements failed");

    // 10. Nested arr.eval on 0-row DataFrame
    const dfEmpty = $df.dataFrame({ arr: [] as number[][] });
    const r10 = dfEmpty.select($df.col("arr").arr.eval($df.element<number>().add(1)).alias("out"));
    assert(r10.height === 0 && r10.width === 1, "10: 0-row DataFrame arr.eval failed");
    })();

    console.log("✓ $df.element() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.element() tests failed:", err);
    process.exit(1);
}
