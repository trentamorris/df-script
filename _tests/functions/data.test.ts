declare const process: any;
import { $df, ShapeError } from "../../src/index";

console.log("=========================================");
console.log("STARTING $df.data() TESTS...");
console.log("=========================================");

try {
    // 1. From column dictionary
    const dfFromDict = $df.data({
        a: [1, 2, 3],
        b: ["x", "y", "z"]
    });
    if (dfFromDict.height !== 3 || dfFromDict.width !== 2) {
        throw new Error("$df.data() from column dict dimensions mismatch");
    }

    // 2. From row records array
    const dfFromRows = $df.data([
        { a: 10, b: "foo" },
        { a: 20, b: "bar" }
    ]);
    if (dfFromRows.height !== 2 || dfFromRows.width !== 2 || dfFromRows.toDicts()[1].b !== "bar") {
        throw new Error("$df.data() from row records failed");
    }

    // 3. With explicit schema on column dict
    const dfWithSchema = $df.data(
        { id: ["1", "2"], flag: [1, 0] },
        { id: $df.Int32, flag: $df.Boolean }
    );
    const rows = dfWithSchema.toDicts();
    if (rows[0].id !== 1 || rows[0].flag !== true || rows[1].id !== 2 || rows[1].flag !== false) {
        throw new Error("$df.data() with explicit schema coercion failed: " + JSON.stringify(rows));
    }

    // 4. With explicit generic type parameter <T> and row records + schema
    interface UserRow {
        id: number;
        name: string;
        active?: boolean | null;
    }
    const typedDf = $df.data<UserRow>(
        [
            { id: 1, name: "Alice", active: true },
            { id: 2, name: "Bob" }
        ],
        { id: $df.Int32, name: $df.Utf8, active: $df.Boolean }
    );
    const typedRows = typedDf.toDicts();
    if (typedDf.height !== 2 || typedDf.width !== 3 || typedRows[1].active !== null) {
        throw new Error("$df.data<UserRow>() with sparse rows and schema failed: " + JSON.stringify(typedRows));
    }

    // 5. Empty inputs (empty row array, empty column dict, 0-length columns with schema)
    const emptyRowsDf = $df.data([]);
    if (emptyRowsDf.height !== 0 || emptyRowsDf.width !== 0) {
        throw new Error("$df.data([]) failed");
    }

    const emptyDictDf = $df.data({});
    if (emptyDictDf.height !== 0 || emptyDictDf.width !== 0) {
        throw new Error("$df.data({}) failed");
    }

    const emptySchemaDf = $df.data([], { a: $df.Int32, b: $df.Utf8 });
    if (emptySchemaDf.height !== 0 || emptySchemaDf.width !== 2 || emptySchemaDf.columns.length !== 2) {
        throw new Error("$df.data([], schema) failed");
    }

    // 6. TypedArray columns inside column dictionary
    const typedArrDf = $df.data({
        i32: new Int32Array([10, 20, 30]),
        f64: new Float64Array([1.5, 2.5, 3.5])
    });
    if (typedArrDf.height !== 3 || typedArrDf.item(2, "f64") !== 3.5) {
        throw new Error("$df.data() with TypedArray columns failed");
    }

    // 7. Mismatched column lengths in dictionary should throw ShapeError
    let threwShape = false;
    try {
        $df.data({ a: [1, 2], b: [1, 2, 3] });
    } catch (e) {
        if (e instanceof ShapeError) threwShape = true;
    }
    if (!threwShape) {
        throw new Error("Expected ShapeError for mismatched column lengths in $df.data()");
    }

    console.log("✓ $df.data() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.data() tests failed:", err);
    process.exit(1);
}
