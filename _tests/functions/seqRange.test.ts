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
        $df.seqRange(10).alias("seq")
    ]).toDicts() as any[];
    if (r1.length !== 4) throw new Error("r1 length mismatch");
    if (r1[0].seq !== 10 || r1[1].seq !== 11 || r1[2].seq !== 12 || r1[3].seq !== 13) {
        throw new Error("r1 default step failed: " + JSON.stringify(r1));
    }

    // 2. Cumulative Mode: Numeric step (3)
    const r2 = df.select([
        $df.seqRange(3, { step: 3 }).alias("seq")
    ]).toDicts() as any[];
    if (r2[0].seq !== 3 || r2[1].seq !== 6 || r2[2].seq !== 9 || r2[3].seq !== 12) {
        throw new Error("r2 numeric step failed: " + JSON.stringify(r2));
    }

    // 3. Cumulative Mode: Callback step (prev * 3) -> Geometric sequence
    const r3 = df.select([
        $df.seqRange(3, { step: ({ prev }: { prev: number }) => prev * 3 }).alias("seq")
    ]).toDicts() as any[];
    if (r3[0].seq !== 3 || r3[1].seq !== 9 || r3[2].seq !== 27 || r3[3].seq !== 81) {
        throw new Error("r3 callback step failed: " + JSON.stringify(r3));
    }

    // 4. Independent Mode: Numeric step (3) -> start + i * 3
    const r4 = df.select([
        $df.seqRange(10, { step: 3, mode: "independent" }).alias("seq")
    ]).toDicts() as any[];
    if (r4[0].seq !== 10 || r4[1].seq !== 13 || r4[2].seq !== 16 || r4[3].seq !== 19) {
        throw new Error("r4 independent numeric step failed: " + JSON.stringify(r4));
    }

    // 5. Independent Mode: Callback step (i * 3) -> step(i)
    const r5 = df.select([
        $df.seqRange(0, { step: ({ index }: { index: number }) => index * 3, mode: "independent" }).alias("seq")
    ]).toDicts() as any[];
    if (r5[0].seq !== 0 || r5[1].seq !== 3 || r5[2].seq !== 6 || r5[3].seq !== 9) {
        throw new Error("r5 independent callback step failed: " + JSON.stringify(r5));
    }

    // 6. Non-strict Mode: startIndex, endIndex, and padding (n = 2, pad = true)
    // slice width = 3 (from 1 to 4). n = 2 -> pads index 3 with "missing"
    const r6 = df.select([
        $df.seqRange(10, {
            strict: false,
            startIndex: 1,
            endIndex: 4,
            n: 2,
            pad: true,
            padValue: "missing"
        }).alias("seq")
    ]).toDicts() as any[];
    if (r6[0].seq !== "missing" || r6[1].seq !== "10" || r6[2].seq !== "11" || r6[3].seq !== "missing") {
        throw new Error("r6 non-strict slice/padding failed: " + JSON.stringify(r6));
    }

    // 7. Non-strict Mode: startIndex, endIndex, and truncation (n = 4, truncate = true)
    // slice width = 2 (from 1 to 3). n = 4 -> truncates to length 2
    const r7 = df.select([
        $df.seqRange(5, {
            strict: false,
            startIndex: 1,
            endIndex: 3,
            n: 4,
            truncate: true,
            padValue: "missing"
        }).alias("seq")
    ]).toDicts() as any[];
    if (r7[0].seq !== "missing" || r7[1].seq !== "5" || r7[2].seq !== "6" || r7[3].seq !== "missing") {
        throw new Error("r7 non-strict slice/truncation failed: " + JSON.stringify(r7));
    }


    // 8. Strict Mode Mismatch Error
    let strictThrew = false;
    try {
        df.select([$df.seqRange(1, { n: 2 })]);
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
        $df.seqRange(10.5, { step: 1.5, dtype: $df.Int32, name: "coerced" })
    ]).toDicts() as any[];
    if (r9[0].coerced !== 10 || r9[1].coerced !== 12 || r9[2].coerced !== 13 || r9[3].coerced !== 15) {
        // Values: [10.5, 12, 13.5, 15] -> Coerced: [10, 12, 13, 15]
        throw new Error("r9 dtype coercion/renaming failed: " + JSON.stringify(r9));
    }

    // 10. Complex 10/10 Edge Cases
    // 10.1 Negative Indexing Slice with Floating Steps and Float64 Typed Allocation
    const df6 = $df.data([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }, { a: 6 }]);
    const r10 = df6.select([
        $df.seqRange(0.25, {
            strict: false,
            startIndex: -4, // index 2
            endIndex: -1,   // index 5 -> width 3
            step: 0.5,
            padValue: -99.9,
            dtype: $df.Float64,
            mode: "cumulative"
        }).alias("seq")
    ]).toDicts() as any[];
    if (r10.length !== 6) throw new Error("r10 length mismatch");
    if (r10[0].seq !== -99.9 || r10[1].seq !== -99.9 || r10[2].seq !== 0.25 || r10[3].seq !== 0.75 || r10[4].seq !== 1.25 || r10[5].seq !== -99.9) {
        throw new Error("r10 negative slice with float typed allocation failed: " + JSON.stringify(r10));
    }

    // 10.2 State-Accumulator Function with Geometric Decay and Int32 Cast
    const r11 = df.select([
        $df.seqRange(1000, {
            step: ({ prev }: { prev: number }) => Math.floor(prev / 2),
            dtype: $df.Int32,
            mode: "cumulative"
        }).alias("decay")
    ]).toDicts() as any[];
    if (r11[0].decay !== 1000 || r11[1].decay !== 500 || r11[2].decay !== 250 || r11[3].decay !== 125) {
        throw new Error("r11 geometric decay sequence failed: " + JSON.stringify(r11));
    }

    // 10.3 Empty / Out-of-Bounds Slices (startIndex >= endIndex)
    const r12 = df.select([
        $df.seqRange(100, {
            strict: false,
            startIndex: 3,
            endIndex: 1, // slice width = 0
            padValue: 0,
            mode: "constant"
        }).alias("zero_slice")
    ]).toDicts() as any[];
    if (r12.some((row: any) => row.zero_slice !== 0)) {
        throw new Error("r12 empty slice should be filled with padValue");
    }

    // 10.4 String Sequences with Cumulative Concatenation
    const r13 = df.select([
        $df.seqRange("A", {
            step: ({ prev }: { prev: string }) => prev + "A",
            mode: "cumulative"
        }).alias("str_seq")
    ]).toDicts() as any[];
    if (r13[0].str_seq !== "A" || r13[1].str_seq !== "AA" || r13[2].str_seq !== "AAA" || r13[3].str_seq !== "AAAA") {
        throw new Error("r13 string sequence generation failed: " + JSON.stringify(r13));
    }

    console.log("\n🎉 ALL COLUMN EXPRESSION SEQ_RANGE TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Column Expression SEQ_RANGE TESTS FAILED:", err);
    throw err;
}


