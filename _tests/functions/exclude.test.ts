declare const process: any;
import { $df } from "df-script";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION $df.exclude() TESTS...");
console.log("=========================================");

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(msg);
}

try {
    const df = $df.dataFrame({
        id: [1, 2],
        name: ["Alice", "Bob"],
        secret: ["123", "456"],
        score: [90, 80]
    });

    // 1. Select with $df.exclude single column
    const res1 = df.select($df.exclude("secret")).toDicts();
    if (res1.length !== 2) throw new Error("Length mismatch");
    if ("secret" in res1[0] || !("id" in res1[0]) || !("name" in res1[0]) || !("score" in res1[0])) {
        throw new Error("$df.exclude('secret') failed: " + JSON.stringify(res1));
    }

    // 2. Select with $df.exclude array of columns
    const res2 = df.select($df.exclude(["secret", "score"])).toDicts();
    if ("secret" in res2[0] || "score" in res2[0] || !("name" in res2[0])) {
        throw new Error("$df.exclude multiple failed: " + JSON.stringify(res2));
    }
    // --- Additional Extreme Edge Cases ---
    (() => {
    const df = $df.dataFrame({ a: [1, 2], b: ["x", "y"], c: [true, false], d: [10, 20] });

    // 1. Exclude single column by string
    const r1 = df.select($df.exclude("a"));
    assert(r1.columns.join(",") === "b,c,d", "1: Exclude single column failed");

    // 2. Exclude multiple columns by array
    const r2 = df.select($df.exclude(["a", "c"]));
    assert(r2.columns.join(",") === "b,d", "2: Exclude multiple columns failed");

    // 3. Exclude non-existent column is a no-op (keeps all columns)
    const r3 = df.select($df.exclude("non_existent"));
    assert(r3.columns.join(",") === "a,b,c,d", "3: Exclude non-existent column should keep all");

    // 4. Exclude empty array keeps all columns
    const r4 = df.select($df.exclude([]));
    assert(r4.columns.join(",") === "a,b,c,d", "4: Exclude empty array should keep all");

    // 5. Exclude all columns returns 0-width DataFrame
    const r5 = df.select($df.exclude(["a", "b", "c", "d"]));
    assert(r5.width === 0, "5: Exclude all columns should have width 0");

    // 6. Exclude duplicate column names in array
    const r6 = df.select($df.exclude(["a", "a", "b"]));
    assert(r6.columns.join(",") === "c,d", "6: Exclude duplicate names failed");

    // 7. Exclude mixed existing and non-existent columns
    const r7 = df.select($df.exclude(["b", "missing", "d"]));
    assert(r7.columns.join(",") === "a,c", "7: Exclude mixed existing/missing failed");

    // 8. Exclude on 0-row DataFrame preserves schema of remaining columns
    const dfEmpty = $df.dataFrame({ a: [], b: [], c: [] });
    const r8 = dfEmpty.select($df.exclude("b"));
    assert(r8.height === 0 && r8.columns.join(",") === "a,c", "8: Exclude on 0-row DF failed");

    // 9. Exclude preserves row values of remaining columns
    const r9 = df.select($df.exclude(["b", "c"])).toDicts() as any[];
    assert(r9[0].a === 1 && r9[0].d === 10 && r9[1].a === 2 && r9[1].d === 20, "9: Values mismatch after exclude");

    // 10. Exclude combined with another expression in select()
    const r10 = df.select($df.exclude(["c", "d"]), $df.col("d").mul(2).alias("d2"));
    assert(r10.columns.join(",") === "a,b,d2" && (r10.toDicts()[0] as any).d2 === 20, "10: Exclude + expr in select failed");
    })();

    console.log("✓ $df.exclude() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.exclude() tests failed:", err);
    process.exit(1);
}
