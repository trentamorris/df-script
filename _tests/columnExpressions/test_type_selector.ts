import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION TYPE SELECTOR TESTS...");
console.log("=========================================");

const schema = {
    id: $df.DataType.Int32,
    name: $df.DataType.Utf8,
    score: $df.DataType.Int32,
    weight: $df.DataType.Decimal(10, 2),
    is_active: $df.DataType.Boolean
};

const df = $df.data([
    { id: 1, name: "Alice", score: 95, weight: 62.5, is_active: true },
    { id: 2, name: "Bob", score: 80, weight: 75.2, is_active: false }
], schema);

try {
    // 1. Select all Int32 columns: id, score
    const r1 = df.select([$df.col($df.DataType.Int32)]).to_dicts();
    if (r1.length !== 2) throw new Error("r1 length mismatch");
    if (!("id" in r1[0]) || !("score" in r1[0]) || "name" in r1[0]) {
        throw new Error("r1 select Int32 failed: " + JSON.stringify(r1));
    }

    // 2. Select all Utf8 columns: name
    const r2 = df.select([$df.col($df.DataType.Utf8)]).to_dicts();
    if (!("name" in r2[0]) || "id" in r2[0]) {
        throw new Error("r2 select Utf8 failed: " + JSON.stringify(r2));
    }

    // 3. Select all Decimal columns (using the constructor class/factory function)
    const r3 = df.select([$df.col($df.DataType.Decimal)]).to_dicts();
    if (!("weight" in r3[0]) || "id" in r3[0]) {
        throw new Error("r3 select Decimal failed: " + JSON.stringify(r3));
    }

    // 4. Using with_columns on specific types (e.g. multiply all Int32 columns by 10)
    const r4 = df.with_columns(
        $df.col($df.DataType.Int32).mul(10)
    ).to_dicts();
    if (r4[0].id !== 10 || r4[0].score !== 950 || r4[0].name !== "Alice") {
        throw new Error("r4 with_columns Int32 failed: " + JSON.stringify(r4));
    }

    // 5. Select all Int32 AND Utf8 columns: id, name, score
    const r5 = df.select([$df.col([$df.DataType.Int32, $df.DataType.Utf8])]).to_dicts();
    if (r5.length !== 2) throw new Error("r5 length mismatch");
    if (!("id" in r5[0]) || !("name" in r5[0]) || !("score" in r5[0]) || "weight" in r5[0]) {
        throw new Error("r5 select multiple datatypes failed: " + JSON.stringify(r5));
    }

    // 6. Select columns using the $df.DataType alias: Utf8, Float64 (none in this schema, so just Utf8 and Int32)
    const r6 = df.select([$df.col([$df.DataType.Utf8, $df.DataType.Int32])]).to_dicts();
    if (r6.length !== 2) throw new Error("r6 length mismatch");
    if (!("id" in r6[0]) || !("name" in r6[0]) || !("score" in r6[0]) || "weight" in r6[0]) {
        throw new Error("r6 select DataType failed: " + JSON.stringify(r6));
    }

    // 7. Select columns using mixed Decimal and Utf8: weight, name
    const r7 = df.select([$df.col([$df.DataType.Decimal, $df.DataType.Utf8])]).to_dicts();
    if (r7.length !== 2) throw new Error("r7 length mismatch");
    if (!("name" in r7[0]) || !("weight" in r7[0]) || "id" in r7[0]) {
        throw new Error("r7 select Decimal & Utf8 failed: " + JSON.stringify(r7));
    }

    console.log("\n🎉 ALL COLUMN EXPRESSION TYPE SELECTOR TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Column Expression TYPE SELECTOR TESTS FAILED:", err);
    process.exit(1);
}
