import { $df, ShapeError } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION SEQ_RANGE TESTS...");
console.log("=========================================");

const df = $df.data([
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 4 }
]);

try {
    // 1. Cumulative Mode: Default step (1)
    const r1 = df.select([
        $df.seq_range(10).alias("seq")
    ]).to_dicts() as any[];
    if (r1.length !== 4) throw new Error("r1 length mismatch");
    if (r1[0].seq !== 10 || r1[1].seq !== 11 || r1[2].seq !== 12 || r1[3].seq !== 13) {
        throw new Error("r1 default step failed: " + JSON.stringify(r1));
    }

    // 2. Cumulative Mode: Numeric step (3)
    const r2 = df.select([
        $df.seq_range(3, { step: 3 }).alias("seq")
    ]).to_dicts() as any[];
    if (r2[0].seq !== 3 || r2[1].seq !== 6 || r2[2].seq !== 9 || r2[3].seq !== 12) {
        throw new Error("r2 numeric step failed: " + JSON.stringify(r2));
    }

    // 3. Cumulative Mode: Callback step (prev * 3) -> Geometric sequence
    const r3 = df.select([
        $df.seq_range(3, { step: ({ prev }: { prev: number }) => prev * 3 }).alias("seq")
    ]).to_dicts() as any[];
    if (r3[0].seq !== 3 || r3[1].seq !== 9 || r3[2].seq !== 27 || r3[3].seq !== 81) {
        throw new Error("r3 callback step failed: " + JSON.stringify(r3));
    }

    // 4. Independent Mode: Numeric step (3) -> start + i * 3
    const r4 = df.select([
        $df.seq_range(10, { step: 3, mode: "independent" }).alias("seq")
    ]).to_dicts() as any[];
    if (r4[0].seq !== 10 || r4[1].seq !== 13 || r4[2].seq !== 16 || r4[3].seq !== 19) {
        throw new Error("r4 independent numeric step failed: " + JSON.stringify(r4));
    }

    // 5. Independent Mode: Callback step (i * 3) -> step(i)
    const r5 = df.select([
        $df.seq_range(0, { step: ({ index }: { index: number }) => index * 3, mode: "independent" }).alias("seq")
    ]).to_dicts() as any[];
    if (r5[0].seq !== 0 || r5[1].seq !== 3 || r5[2].seq !== 6 || r5[3].seq !== 9) {
        throw new Error("r5 independent callback step failed: " + JSON.stringify(r5));
    }

    // 6. Non-strict Mode: startIndex, endIndex, and padding (n = 2, pad = true)
    // slice width = 3 (from 1 to 4). n = 2 -> pads index 3 with "missing"
    const r6 = df.select([
        $df.seq_range(10, {
            strict: false,
            startIndex: 1,
            endIndex: 4,
            n: 2,
            pad: true,
            padValue: "missing"
        }).alias("seq")
    ]).to_dicts() as any[];
    if (r6[0].seq !== "missing" || r6[1].seq !== "10" || r6[2].seq !== "11" || r6[3].seq !== "missing") {
        throw new Error("r6 non-strict slice/padding failed: " + JSON.stringify(r6));
    }

    // 7. Non-strict Mode: startIndex, endIndex, and truncation (n = 4, truncate = true)
    // slice width = 2 (from 1 to 3). n = 4 -> truncates to length 2
    const r7 = df.select([
        $df.seq_range(5, {
            strict: false,
            startIndex: 1,
            endIndex: 3,
            n: 4,
            truncate: true,
            padValue: "missing"
        }).alias("seq")
    ]).to_dicts() as any[];
    if (r7[0].seq !== "missing" || r7[1].seq !== "5" || r7[2].seq !== "6" || r7[3].seq !== "missing") {
        throw new Error("r7 non-strict slice/truncation failed: " + JSON.stringify(r7));
    }


    // 8. Strict Mode Mismatch Error
    let strictThrew = false;
    try {
        df.select([$df.seq_range(1, { n: 2 })]);
    } catch (e: any) {
        if (e instanceof ShapeError && e.message.includes("Column height mismatch")) {
            strictThrew = true;
        }
    }
    if (!strictThrew) {
        throw new Error("Expected strict mode mismatch to throw ShapeError");
    }

    // 9. Dtype Coercion and Rename options
    const r9 = df.select([
        $df.seq_range(10.5, { step: 1.5, dtype: $df.DataType.Int32, name: "coerced" })
    ]).to_dicts() as any[];
    if (r9[0].coerced !== 10 || r9[1].coerced !== 12 || r9[2].coerced !== 13 || r9[3].coerced !== 15) {
        // Values: [10.5, 12, 13.5, 15] -> Coerced: [10, 12, 13, 15]
        throw new Error("r9 dtype coercion/renaming failed: " + JSON.stringify(r9));
    }

    console.log("\n🎉 ALL COLUMN EXPRESSION SEQ_RANGE TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Column Expression SEQ_RANGE TESTS FAILED:", err);
    process.exit(1);
}
