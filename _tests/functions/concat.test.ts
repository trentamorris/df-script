declare const process: any;
import { DataFrame, $df, DataTypeRegistry } from "df-script";

console.log("=========================================");
console.log("STARTING $df.concat FUNCTION TESTS...");
console.log("=========================================");

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(msg);
}

function assertThrows(fn: () => void, msg: string): void {
    let threw = false;
    try {
        fn();
    } catch {
        threw = true;
    }
    if (!threw) throw new Error(msg);
}

try {
    const df1 = new DataFrame([{ id: 1, name: "Alice" }]);
    const df2 = new DataFrame([{ id: 2, name: "Bob" }]);
    const dfEmpty = new DataFrame([]);

    // =========================================================================
    // INPUT VALIDATION & TRIVIAL CASES
    // =========================================================================
    assertThrows(() => $df.concat(null as any), "Expected null input to throw");
    assertThrows(() => $df.concat(undefined as any), "Expected undefined input to throw");
    assertThrows(() => $df.concat([df1, { id: 2 } as any]), "Expected non-DataFrame element to throw");
    assertThrows(() => $df.concat([df1, null as any]), "Expected null element in array to throw");

    const dfFromRows = $df.concat([
        $df.dataFrame([{ id: 1, val: "A" }]),
        $df.dataFrame([{ id: 2, val: "B" }])
    ]);
    assert(dfFromRows.height === 2 && dfFromRows.toDicts()[1].val === "B", "Concat DataFrames from rows failed");

    const dfFromColDict = $df.concat([
        $df.dataFrame({ id: [1], name: ["Alice"] }),
        $df.dataFrame({ id: [2], name: ["Bob"] })
    ]);
    assert(dfFromColDict.height === 2 && dfFromColDict.toDicts()[1].name === "Bob", "Concat column dictionaries failed");

    // =========================================================================
    // VERTICAL CONCATENATION (10 EXTREME EDGE CASES)
    // =========================================================================

    // V1. Empty array returns 0x0 DataFrame
    const v1 = $df.concat([], { how: "vertical" });
    assert(v1.height === 0 && v1.width === 0, "V1: Expected 0x0 DataFrame");

    // V2. Single DataFrame (not wrapped in array)
    const v2 = $df.concat(df1);
    assert(v2.height === 1 && v2.toDicts()[0].name === "Alice", "V2: Single DF failed");

    // V3. All empty DataFrames returns 0x0 DataFrame
    const v3 = $df.concat([dfEmpty, dfEmpty, dfEmpty]);
    assert(v3.height === 0 && v3.width === 0, "V3: All empty DFs should be 0x0");

    // V4. Empty DataFrames interleaved with non-empty DataFrames
    const v4 = $df.concat([dfEmpty, df1, dfEmpty, df2, dfEmpty]);
    assert(v4.height === 2 && v4.toDicts()[0].id === 1 && v4.toDicts()[1].id === 2, "V4: Interleaved empty DFs failed");

    // V5. Column count mismatch throws
    const dfExtraCol = new DataFrame([{ id: 3, name: "C", extra: true }]);
    assertThrows(() => $df.concat([df1, dfExtraCol], { how: "vertical" }), "V5: Column count mismatch should throw");

    // V6. Column name / order mismatch throws
    const dfReordered = new DataFrame([{ name: "Charlie", id: 3 }]);
    assertThrows(() => $df.concat([df1, dfReordered], { how: "vertical" }), "V6: Column order mismatch should throw");

    // V7. Schema type mismatch throws
    const dfTypeMismatch = new DataFrame([{ id: "not_a_number", name: "Charlie" }]);
    assertThrows(() => $df.concat([df1, dfTypeMismatch], { how: "vertical" }), "V7: Schema type mismatch should throw");

    // V8. Null and falsy values preserved across vertical concat
    const dfNulls1 = DataFrame._createDirect(
        { a: [null], b: [0], c: [false], d: [""] },
        { a: DataTypeRegistry.Utf8, b: DataTypeRegistry.Int32, c: DataTypeRegistry.Boolean, d: DataTypeRegistry.Utf8 },
        1
    );
    const dfNulls2 = DataFrame._createDirect(
        { a: ["x"], b: [null], c: [true], d: [null] },
        { a: DataTypeRegistry.Utf8, b: DataTypeRegistry.Int32, c: DataTypeRegistry.Boolean, d: DataTypeRegistry.Utf8 },
        1
    );
    const v8 = $df.concat([dfNulls1, dfNulls2]);
    const v8Rows = v8.toDicts() as any[];
    assert(v8Rows[0].a === null && v8Rows[0].b === 0 && v8Rows[0].c === false && v8Rows[0].d === "", "V8: Falsy/null row 0 mismatch");
    assert(v8Rows[1].a === "x" && v8Rows[1].b === null && v8Rows[1].d === null, "V8: Falsy/null row 1 mismatch");

    // V9. TypedArray columns preserved when all items have typed arrays
    const dfTyped1 = DataFrame._createDirect({ x: new Int32Array([1, 2]) }, { x: DataTypeRegistry.Int32 }, 2);
    const dfTyped2 = DataFrame._createDirect({ x: new Int32Array([3, 4]) }, { x: DataTypeRegistry.Int32 }, 2);
    const v9 = $df.concat([dfTyped1, dfTyped2]);
    assert(v9._columns.x instanceof Int32Array && v9.height === 4, "V9: TypedArray should be preserved");
    assert((v9._columns.x as Int32Array)[3] === 4, "V9: TypedArray value mismatch");

    // V10. Mixed TypedArray and regular JS array in same column falls back cleanly
    const dfRegular = DataFrame._createDirect({ x: [5, 6] }, { x: DataTypeRegistry.Int32 }, 2);
    const v10 = $df.concat([dfTyped1, dfRegular]);
    assert(v10.height === 4 && v10.toDicts()[3].x === 6, "V10: Mixed TypedArray/regular array failed");

    // =========================================================================
    // HORIZONTAL CONCATENATION (10 EXTREME EDGE CASES)
    // =========================================================================
    const dfH1 = new DataFrame([{ a: 1 }, { a: 2 }]);
    const dfH2 = new DataFrame([{ b: 10 }, { b: 20 }]);
    const dfHShort = new DataFrame([{ c: "only1" }]);

    // H1. Single DataFrame in array with how: "horizontal"
    const h1 = $df.concat([dfH1], { how: "horizontal" });
    assert(h1.height === 2 && h1.width === 1 && h1.toDicts()[1].a === 2, "H1: Single DF horizontal failed");

    // H2. Strict mode (default) throws on mismatched heights
    assertThrows(
        () => $df.concat([dfH1, dfHShort], { how: "horizontal" }),
        "H2: Strict horizontal mismatch should throw"
    );

    // H3. Non-strict mode pads shorter DataFrame with null
    const h3 = $df.concat([dfH1, dfHShort], { how: "horizontal", horizontal: { strict: false } });
    const h3Rows = h3.toDicts() as any[];
    assert(h3.height === 2 && h3Rows[0].c === "only1" && h3Rows[1].c === null, "H3: Non-strict padding failed");

    // H4. Non-strict mode with empty (0-row) DataFrame alongside non-empty DataFrame
    const dfEmptyWithCol = DataFrame._createDirect({ z: [] }, { z: DataTypeRegistry.Int32 }, 0);
    const h4 = $df.concat([dfH1, dfEmptyWithCol], { how: "horizontal", horizontal: { strict: false } });
    const h4Rows = h4.toDicts() as any[];
    assert(h4.height === 2 && h4Rows[0].z === null && h4Rows[1].z === null, "H4: Empty DF horizontal padding failed");

    // H5. All empty (0-row) DataFrames horizontally
    const dfEmptyWithCol2 = DataFrame._createDirect({ w: [] }, { w: DataTypeRegistry.Utf8 }, 0);
    const h5 = $df.concat([dfEmptyWithCol, dfEmptyWithCol2], { how: "horizontal" });
    assert(h5.height === 0 && h5.width === 2, "H5: All empty horizontal should have height 0 and width 2");

    // H6. Duplicate column name throws
    assertThrows(
        () => $df.concat([df1, df2], { how: "horizontal" }),
        "H6: Duplicate column name should throw"
    );

    // H7. 3+ DataFrames concatenated horizontally
    const dfH3 = new DataFrame([{ d: true }, { d: false }]);
    const h7 = $df.concat([dfH1, dfH2, dfH3], { how: "horizontal" });
    assert(h7.height === 2 && h7.width === 3 && h7.toDicts()[1].d === false, "H7: 3-way horizontal failed");

    // H8. TypedArray columns in horizontal concat (equal height and padded)
    const dfHTyped = DataFrame._createDirect({ t: new Int32Array([7]) }, { t: DataTypeRegistry.Int32 }, 1);
    const h8 = $df.concat([dfH1, dfHTyped], { how: "horizontal", horizontal: { strict: false } });
    const h8Rows = h8.toDicts() as any[];
    assert(h8Rows[0].t === 7 && h8Rows[1].t === null, "H8: Horizontal TypedArray padding failed");

    // H9. Preserves NaN, 0, false, "" in horizontal concat
    const dfHFalsy = new DataFrame([{ n: NaN, z: 0, f: false, s: "" }]);
    const h9 = $df.concat([dfHShort, dfHFalsy], { how: "horizontal" });
    const h9Row = h9.toDicts()[0] as any;
    assert(Number.isNaN(h9Row.n) && h9Row.z === 0 && h9Row.f === false && h9Row.s === "", "H9: Falsy/NaN preservation failed");

    // H10. 0-column empty DataFrame concatenated horizontally with non-empty DataFrame (non-strict)
    const h10 = $df.concat([dfEmpty, dfH1], { how: "horizontal", horizontal: { strict: false } });
    assert(h10.height === 2 && h10.width === 1 && h10.toDicts()[1].a === 2, "H10: 0-col empty DF horizontal failed");

    // =========================================================================
    // DIAGONAL CONCATENATION (10 EXTREME EDGE CASES)
    // =========================================================================

    // D1. Disjoint columns fill missing cells with null
    const dfD1 = new DataFrame([{ a: 1 }]);
    const dfD2 = new DataFrame([{ b: "x" }]);
    const d1 = $df.concat([dfD1, dfD2], { how: "diagonal" });
    const d1Rows = d1.toDicts() as any[];
    assert(d1.height === 2 && d1.width === 2 && d1Rows[0].b === null && d1Rows[1].a === null, "D1: Disjoint diagonal failed");

    // D2. Overlapping + disjoint columns across 3 DataFrames
    const dfD3 = new DataFrame([{ a: 3, c: true }]);
    const d2 = $df.concat([dfD1, dfD2, dfD3], { how: "diagonal" });
    const d2Rows = d2.toDicts() as any[];
    assert(d2.height === 3 && d2.width === 3, "D2: 3-way diagonal shape mismatch");
    assert(d2Rows[0].c === null && d2Rows[2].a === 3 && d2Rows[2].b === null && d2Rows[2].c === true, "D2: 3-way diagonal values mismatch");

    // D3. Empty DataFrame interleaved in diagonal concat
    const d3 = $df.concat([dfEmpty, dfD1, dfEmpty, dfD2, dfEmpty], { how: "diagonal" });
    assert(d3.height === 2 && d3.width === 2, "D3: Interleaved empty DF diagonal failed");

    // D4. All empty DataFrames in diagonal concat returns 0x0
    const d4 = $df.concat([dfEmpty, dfEmpty], { how: "diagonal" });
    assert(d4.height === 0 && d4.width === 0, "D4: All empty diagonal should be 0x0");

    // D5. Schema type mismatch on overlapping column throws
    assertThrows(
        () => $df.concat([df1, dfTypeMismatch], { how: "diagonal" }),
        "D5: Diagonal schema mismatch should throw"
    );

    // D6. Column appearing only in last DF gets null for all earlier rows
    const dfD6 = new DataFrame([{ late: 99 }]);
    const d6 = $df.concat([dfD1, dfD2, dfD6], { how: "diagonal" });
    const d6Rows = d6.toDicts() as any[];
    assert(d6Rows[0].late === null && d6Rows[1].late === null && d6Rows[2].late === 99, "D6: Late column padding failed");

    // D7. Column with null values in one DF and typed values in another
    const dfDNull = DataFrame._createDirect({ a: [null] }, { a: DataTypeRegistry.Int32 }, 1);
    const d7 = $df.concat([dfDNull, dfD1], { how: "diagonal" });
    const d7Rows = d7.toDicts() as any[];
    assert(d7Rows[0].a === null && d7Rows[1].a === 1, "D7: Null + typed diagonal failed");

    // D8. TypedArray columns in diagonal concat pad with null cleanly
    const d8 = $df.concat([dfTyped1, dfD2], { how: "diagonal" });
    const d8Rows = d8.toDicts() as any[];
    assert(d8.height === 3 && d8Rows[0].x === 1 && d8Rows[2].x === null && d8Rows[2].b === "x", "D8: TypedArray diagonal failed");

    // D9. Row order preserved across 5 DataFrames
    const d9 = $df.concat([
        new DataFrame([{ k: 1 }]),
        new DataFrame([{ k: 2 }]),
        new DataFrame([{ k: 3 }]),
        new DataFrame([{ k: 4 }]),
        new DataFrame([{ k: 5 }])
    ], { how: "diagonal" });
    assert(d9.height === 5 && d9.toDicts().map((r: any) => r.k).join(",") === "1,2,3,4,5", "D9: Row order mismatch");

    // D10. Special values (NaN, 0, false, "") preserved alongside null padding
    const dfDSpecial = new DataFrame([{ n: NaN, z: 0, f: false, s: "" }]);
    const d10 = $df.concat([dfD1, dfDSpecial], { how: "diagonal" });
    const d10Rows = d10.toDicts() as any[];
    assert(
        d10Rows[0].z === null &&
        Number.isNaN(d10Rows[1].n) &&
        d10Rows[1].z === 0 &&
        d10Rows[1].f === false &&
        d10Rows[1].s === "",
        "D10: Special values diagonal failed"
    );

    console.log("✓ $df.concat tests passed successfully!");
} catch (e: any) {
    console.error(`❌ $df.concat test failed: ${e.message}`);
    process.exit(1);
}
