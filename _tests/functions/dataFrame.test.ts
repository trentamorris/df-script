declare const process: any;
import { DataFrame, $df, DataTypeRegistry } from "df-script";

console.log("=========================================");
console.log("STARTING $df.dataFrame FUNCTION TESTS...");
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
    // 1. Empty array of rows returns 0x0 DataFrame
    const df1 = $df.dataFrame([]);
    assert(df1.height === 0 && df1.width === 0, "1: Empty row array should be 0x0");

    // 2. Empty column dictionary returns 0x0 DataFrame
    const df2 = $df.dataFrame({});
    assert(df2.height === 0 && df2.width === 0, "2: Empty column dict should be 0x0");

    // 3. Column dictionary with empty arrays returns 0-row DataFrame with columns
    const df3 = $df.dataFrame({ a: [], b: [] });
    assert(df3.height === 0 && df3.width === 2, "3: Empty column arrays should have height 0, width 2");

    // 4. Ragged/missing keys in row objects fill missing cells with null
    const df4 = $df.dataFrame([
        { a: 1 },
        { a: 2, b: "x" },
        { b: "y", c: true }
    ] as any);
    const r4 = df4.toDicts() as any[];
    assert(df4.height === 3 && df4.width === 3, "4: Ragged rows shape mismatch");
    assert(r4[0].b === null && r4[0].c === null && r4[2].a === null, "4: Ragged rows null fill failed");

    // 5. Explicit schema overrides inferred types
    const df5 = $df.dataFrame({ a: [1, 2], b: ["10", "20"] }, { a: DataTypeRegistry.Float64, b: DataTypeRegistry.Int32 });
    assert(df5.schema.a.equals(DataTypeRegistry.Float64), "5: Explicit schema Float64 failed");
    assert(df5.schema.b.equals(DataTypeRegistry.Int32), "5: Explicit schema Int32 failed");

    // 6. TypedArray column input in column dictionary
    const df6 = $df.dataFrame({ x: new Int32Array([10, 20, 30]) });
    assert(df6.height === 3 && df6.toDicts()[2].x === 30, "6: TypedArray column input failed");

    // 7. Mismatched column lengths in column dictionary throws
    assertThrows(() => $df.dataFrame({ a: [1, 2], b: [1] }), "7: Mismatched column lengths should throw");

    // 8. Preserves NaN, 0, false, "", null, undefined->null
    const df8 = $df.dataFrame([{ n: NaN, z: 0, f: false, s: "", u: undefined, nu: null }]);
    const r8 = df8.toDicts()[0] as any;
    assert(Number.isNaN(r8.n) && r8.z === 0 && r8.f === false && r8.s === "" && r8.nu === null, "8: Special values failed");

    // 9. Nested array and object cells preserved
    const df9 = $df.dataFrame([{ arr: [1, 2], obj: { k: "v" } }]);
    const r9 = df9.toDicts()[0] as any;
    assert(Array.isArray(r9.arr) && r9.arr[1] === 2 && r9.obj.k === "v", "9: Nested array/object failed");

    // 10. Returns a true DataFrame instance
    assert(df9 instanceof DataFrame, "10: Should return DataFrame instance");

    console.log("✓ $df.dataFrame tests passed successfully!");
} catch (e: any) {
    console.error(`❌ $df.dataFrame test failed: ${e.message}`);
    process.exit(1);
}
