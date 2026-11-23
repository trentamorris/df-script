declare const process: any;
import { DataFrame } from "df-script";
import { DataTypeRegistry } from "df-script";
import { $df } from "df-script";

console.log("=========================================");
console.log("STARTING DATAFRAME EQUALS 10/10 TESTS...");
console.log("=========================================");

try {
    // ------------------------------------------------------------------------
    // 1. Identity & Non-DataFrame Guards
    // ------------------------------------------------------------------------
    const df1 = $df.dataFrame([
        { a: 1, b: "x" },
        { a: 2, b: "y" }
    ]);
    if (!df1.equals(df1)) {
        throw new Error("1.1 Identity check failed: df.equals(df) must be true");
    }
    if ((df1 as any).equals(null)) {
        throw new Error("1.2 df.equals(null) must be false");
    }
    if ((df1 as any).equals(undefined)) {
        throw new Error("1.3 df.equals(undefined) must be false");
    }
    if ((df1 as any).equals({ a: [1, 2], b: ["x", "y"] })) {
        throw new Error("1.4 df.equals(plainObject) must be false");
    }
    if ((df1 as any).equals([1, 2])) {
        throw new Error("1.5 df.equals(array) must be false");
    }
    if ((df1 as any).equals("DataFrame")) {
        throw new Error("1.6 df.equals(string) must be false");
    }

    // ------------------------------------------------------------------------
    // 2. Clones & Symmetry
    // ------------------------------------------------------------------------
    const df2 = df1.clone();
    if (!df1.equals(df2) || !df2.equals(df1)) {
        throw new Error("2.1 Cloned DataFrames must be equal symmetrically");
    }

    // ------------------------------------------------------------------------
    // 3. Shape Mismatches (Height & Width)
    // ------------------------------------------------------------------------
    const dfShorter = $df.dataFrame([{ a: 1, b: "x" }]);
    if (df1.equals(dfShorter) || dfShorter.equals(df1)) {
        throw new Error("3.1 Height mismatch must return false");
    }

    const dfWider = $df.dataFrame([
        { a: 1, b: "x", c: 100 },
        { a: 2, b: "y", c: 200 }
    ]);
    if (df1.equals(dfWider) || dfWider.equals(df1)) {
        throw new Error("3.2 Column count mismatch must return false");
    }

    // Height-only DataFrames (zero columns with height)
    const dfZeroColsH3A = DataFrame._createDirect({}, {}, 3);
    const dfZeroColsH3B = DataFrame._createDirect({}, {}, 3);
    const dfZeroColsH4 = DataFrame._createDirect({}, {}, 4);
    if (!dfZeroColsH3A.equals(dfZeroColsH3B)) {
        throw new Error("3.3 Zero-column DataFrames with same height must be equal");
    }
    if (dfZeroColsH3A.equals(dfZeroColsH4)) {
        throw new Error("3.4 Zero-column DataFrames with different heights must not be equal");
    }

    // ------------------------------------------------------------------------
    // 4. Column Names & Strict Column Ordering
    // ------------------------------------------------------------------------
    const dfDifferentCol = $df.dataFrame([
        { a: 1, c: "x" },
        { a: 2, c: "y" }
    ]);
    if (df1.equals(dfDifferentCol)) {
        throw new Error("4.1 Different column names must return false");
    }

    // Exact same columns and data, but reversed column order
    const dfReordered = $df.dataFrame({
        b: ["x", "y"],
        a: [1, 2]
    });
    if (df1.equals(dfReordered) || dfReordered.equals(df1)) {
        throw new Error("4.2 Reordered columns must return false (strict column order)");
    }

    // Case sensitivity in column names
    const dfColCase = $df.dataFrame({
        A: [1, 2],
        b: ["x", "y"]
    });
    if (df1.equals(dfColCase)) {
        throw new Error("4.3 Column name case sensitivity must return false");
    }

    // ------------------------------------------------------------------------
    // 5. Value Mismatch & Position Sensitivity
    // ------------------------------------------------------------------------
    const dfDifferentVal = $df.dataFrame([
        { a: 1, b: "x" },
        { a: 999, b: "y" }
    ]);
    if (df1.equals(dfDifferentVal)) {
        throw new Error("5.1 Row value mismatch must return false");
    }

    // Swapped row order (same set of rows, different order)
    const dfSwappedRows = $df.dataFrame([
        { a: 2, b: "y" },
        { a: 1, b: "x" }
    ]);
    if (df1.equals(dfSwappedRows)) {
        throw new Error("5.2 Swapped row order must return false");
    }

    // ------------------------------------------------------------------------
    // 6. Strict Schema Type Checking
    // ------------------------------------------------------------------------
    const dfInt32 = DataFrame._createDirect({ x: [1, 2] }, { x: DataTypeRegistry.Int32 }, 2);
    const dfFloat64 = DataFrame._createDirect({ x: [1, 2] }, { x: DataTypeRegistry.Float64 }, 2);
    const dfInt64 = DataFrame._createDirect({ x: [1, 2] }, { x: DataTypeRegistry.Int64 }, 2);
    const dfUtf8 = DataFrame._createDirect({ x: ["1", "2"] }, { x: DataTypeRegistry.Utf8 }, 2);

    if (dfInt32.equals(dfFloat64)) {
        throw new Error("6.1 Schema mismatch (Int32 vs Float64) must return false");
    }
    if (dfInt32.equals(dfInt64)) {
        throw new Error("6.2 Schema mismatch (Int32 vs Int64) must return false");
    }
    if (dfFloat64.equals(dfUtf8)) {
        throw new Error("6.3 Schema mismatch (Float64 vs Utf8) must return false");
    }

    // ------------------------------------------------------------------------
    // 7. Null, Undefined & NaN Semantics (nullsEqual: true vs false)
    // ------------------------------------------------------------------------
    const dfNulls1 = $df.dataFrame({
        n: [null, NaN, 1],
        s: ["hello", null, "world"]
    });
    const dfNulls2 = $df.dataFrame({
        n: [null, NaN, 1],
        s: ["hello", null, "world"]
    });
    // Default nullsEqual = true
    if (!dfNulls1.equals(dfNulls2)) {
        throw new Error("7.1 Matching nulls & NaNs must be equal with nullsEqual=true (default)");
    }
    if (!dfNulls1.equals(dfNulls2, { nullsEqual: true })) {
        throw new Error("7.2 Explicit nullsEqual=true must be equal");
    }
    // nullsEqual = false
    if (dfNulls1.equals(dfNulls2, { nullsEqual: false })) {
        throw new Error("7.3 nullsEqual=false must reject frames containing nulls or NaNs");
    }

    // Clean frame without any null/NaN with nullsEqual=false must still be equal
    const dfClean1 = $df.dataFrame({ a: [1, 2], b: ["x", "y"] });
    const dfClean2 = $df.dataFrame({ a: [1, 2], b: ["x", "y"] });
    if (!dfClean1.equals(dfClean2, { nullsEqual: false })) {
        throw new Error("7.4 Clean frame with nullsEqual=false must return true");
    }

    // Null vs Undefined distinction
    const dfNullVal = DataFrame._createDirect({ a: [null] }, { a: DataTypeRegistry.Float64 }, 1);
    const dfUndefVal = DataFrame._createDirect({ a: [undefined] }, { a: DataTypeRegistry.Float64 }, 1);
    if (dfNullVal.equals(dfUndefVal)) {
        throw new Error("7.5 null vs undefined at same index must return false (Object.is)");
    }

    // Null vs NaN distinction
    const dfNaNVal = DataFrame._createDirect({ a: [NaN] }, { a: DataTypeRegistry.Float64 }, 1);
    if (dfNullVal.equals(dfNaNVal)) {
        throw new Error("7.6 null vs NaN must return false");
    }

    // Null vs 0, false, empty string
    const dfZero = $df.dataFrame({ a: [0] });
    const dfNull0 = $df.dataFrame({ a: [null] });
    if (dfZero.equals(dfNull0)) {
        throw new Error("7.7 0 vs null must return false");
    }

    const dfFalse = $df.dataFrame({ a: [false] });
    const dfNullBool = $df.dataFrame({ a: [null] });
    if (dfFalse.equals(dfNullBool)) {
        throw new Error("7.8 false vs null must return false");
    }

    const dfEmptyStr = $df.dataFrame({ a: [""] });
    const dfNullStr = $df.dataFrame({ a: [null] });
    if (dfEmptyStr.equals(dfNullStr)) {
        throw new Error("7.9 '' vs null must return false");
    }

    // ------------------------------------------------------------------------
    // 8. Special IEEE 754 Floats (-0 vs +0, Infinity, -Infinity)
    // ------------------------------------------------------------------------
    const dfPosZero = DataFrame._createDirect({ v: [0] }, { v: DataTypeRegistry.Float64 }, 1);
    const dfNegZero = DataFrame._createDirect({ v: [-0] }, { v: DataTypeRegistry.Float64 }, 1);
    // Object.is(+0, -0) is false in JavaScript!
    if (dfPosZero.equals(dfNegZero)) {
        throw new Error("8.1 +0 vs -0 must return false under Object.is");
    }
    if (!dfNegZero.equals(DataFrame._createDirect({ v: [-0] }, { v: DataTypeRegistry.Float64 }, 1))) {
        throw new Error("8.2 -0 vs -0 must return true");
    }

    const dfInf1 = $df.dataFrame({ v: [Infinity, -Infinity] });
    const dfInf2 = $df.dataFrame({ v: [Infinity, -Infinity] });
    const dfInfDiff = $df.dataFrame({ v: [-Infinity, Infinity] });
    if (!dfInf1.equals(dfInf2)) {
        throw new Error("8.3 Infinity & -Infinity must match identical signs");
    }
    if (dfInf1.equals(dfInfDiff)) {
        throw new Error("8.4 Infinity vs -Infinity must return false");
    }

    // ------------------------------------------------------------------------
    // 9. BigInt Columns & Boundary Values
    // ------------------------------------------------------------------------
    const dfBigInt1 = $df.dataFrame({ b: [9007199254740993n, -9007199254740993n, 0n] });
    const dfBigInt2 = $df.dataFrame({ b: [9007199254740993n, -9007199254740993n, 0n] });
    const dfBigIntDiff = $df.dataFrame({ b: [9007199254740993n, -9007199254740994n, 0n] });

    if (!dfBigInt1.equals(dfBigInt2)) {
        throw new Error("9.1 BigInt columns with equal values must return true");
    }
    if (dfBigInt1.equals(dfBigIntDiff)) {
        throw new Error("9.2 BigInt columns with differing values must return false");
    }

    // BigInt vs Number with same numeric value (e.g., 0n vs 0)
    const dfNumZero = $df.dataFrame({ b: [0] });
    const dfBigZero = $df.dataFrame({ b: [0n] });
    if (dfNumZero.equals(dfBigZero)) {
        throw new Error("9.3 0 (number) vs 0n (bigint) must return false");
    }

    // ------------------------------------------------------------------------
    // 10. TypedArray Buffers
    // ------------------------------------------------------------------------
    const dfTyped1 = DataFrame._createDirect({
        nums: new Int32Array([10, 20, 30])
    }, {
        nums: DataTypeRegistry.Int32
    }, 3);

    const dfTyped2 = DataFrame._createDirect({
        nums: new Int32Array([10, 20, 30])
    }, {
        nums: DataTypeRegistry.Int32
    }, 3);

    const dfTypedDiff = DataFrame._createDirect({
        nums: new Int32Array([10, 999, 30])
    }, {
        nums: DataTypeRegistry.Int32
    }, 3);

    if (!dfTyped1.equals(dfTyped2)) {
        throw new Error("10.1 TypedArrays with identical values must return true");
    }
    if (dfTyped1.equals(dfTypedDiff)) {
        throw new Error("10.2 TypedArrays with different values must return false");
    }

    // Different TypedArray backing types with same numbers
    const dfUint32 = DataFrame._createDirect({
        nums: new Uint32Array([10, 20, 30])
    }, {
        nums: DataTypeRegistry.UInt32
    }, 3);
    if (dfTyped1.equals(dfUint32)) {
        throw new Error("10.3 Int32Array vs Uint32Array must return false due to schema");
    }

    // Float64Array with NaNs
    const dfFloatTyped1 = DataFrame._createDirect({
        f: new Float64Array([1.5, NaN, 3.5])
    }, {
        f: DataTypeRegistry.Float64
    }, 3);
    const dfFloatTyped2 = DataFrame._createDirect({
        f: new Float64Array([1.5, NaN, 3.5])
    }, {
        f: DataTypeRegistry.Float64
    }, 3);
    if (!dfFloatTyped1.equals(dfFloatTyped2)) {
        throw new Error("10.4 Float64Array with NaN must return true");
    }
    if (dfFloatTyped1.equals(dfFloatTyped2, { nullsEqual: false })) {
        throw new Error("10.5 Float64Array with NaN and nullsEqual=false must return false");
    }

    // ------------------------------------------------------------------------
    // 11. Empty DataFrames
    // ------------------------------------------------------------------------
    const empty1 = $df.dataFrame([]);
    const empty2 = $df.dataFrame([]);
    if (!empty1.equals(empty2)) {
        throw new Error("11.1 Two completely empty DataFrames must be equal");
    }

    const emptyWithCols1 = $df.dataFrame({ a: [], b: [] });
    const emptyWithCols2 = $df.dataFrame({ a: [], b: [] });
    const emptyWithColsDiff = $df.dataFrame({ a: [], c: [] });
    const emptyWithColsReordered = $df.dataFrame({ b: [], a: [] });

    if (!emptyWithCols1.equals(emptyWithCols2)) {
        throw new Error("11.2 Empty DataFrames with same columns must be equal");
    }
    if (emptyWithCols1.equals(emptyWithColsDiff)) {
        throw new Error("11.3 Empty DataFrames with different columns must return false");
    }
    if (emptyWithCols1.equals(emptyWithColsReordered)) {
        throw new Error("11.4 Empty DataFrames with reordered columns must return false");
    }

    // 0-height empty vs 1-height empty
    const singleRow = $df.dataFrame([{ a: 1 }]);
    const emptyA = $df.dataFrame({ a: [] });
    if (singleRow.equals(emptyA) || emptyA.equals(singleRow)) {
        throw new Error("11.5 Empty vs non-empty must return false");
    }

    // ------------------------------------------------------------------------
    // 12. Object Reference Equality (No Deep-Clone Equivalence)
    // ------------------------------------------------------------------------
    const sharedObj = { id: 42 };
    const dfRef1 = $df.dataFrame({ o: [sharedObj] });
    const dfRef2 = $df.dataFrame({ o: [sharedObj] });
    const dfDistinctObj = $df.dataFrame({ o: [{ id: 42 }] });

    if (!dfRef1.equals(dfRef2)) {
        throw new Error("12.1 Same object reference must return true");
    }
    if (dfRef1.equals(dfDistinctObj)) {
        throw new Error("12.2 Distinct object instances must return false (no implicit deep normalization)");
    }

    const sharedDate = new Date("2026-01-01T00:00:00Z");
    const dfDateRef1 = $df.dataFrame({ d: [sharedDate] });
    const dfDateRef2 = $df.dataFrame({ d: [sharedDate] });
    const dfDateDistinct = $df.dataFrame({ d: [new Date("2026-01-01T00:00:00Z")] });

    if (!dfDateRef1.equals(dfDateRef2)) {
        throw new Error("12.3 Same Date reference must return true");
    }
    if (dfDateRef1.equals(dfDateDistinct)) {
        throw new Error("12.4 Distinct Date instances must return false under Object.is");
    }

    // ------------------------------------------------------------------------
    // 13. Single Element DataFrames
    // ------------------------------------------------------------------------
    const single1 = $df.dataFrame({ x: [42] });
    const single2 = $df.dataFrame({ x: [42] });
    const single3 = $df.dataFrame({ x: [43] });
    if (!single1.equals(single2)) {
        throw new Error("13.1 Single element equal frames must return true");
    }
    if (single1.equals(single3)) {
        throw new Error("13.2 Single element differing frames must return false");
    }

    console.log("=========================================");
    console.log("🎉 ALL DATAFRAME EQUALS 10/10 TESTS PASSED!");
    console.log("=========================================");
} catch (err) {
    console.error("❌ DataFrame.equals tests failed:", err);
    process.exit(1);
}
