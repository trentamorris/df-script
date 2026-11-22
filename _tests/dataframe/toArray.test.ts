import { DataFrame, $df } from "df-script";

console.log("Running toArray tests...");

const df = new DataFrame([
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
]);

// 1. Column array extraction
const resArray = df.toArray("name");
if (!Array.isArray(resArray) || resArray.length !== 2 || resArray[0] !== "Alice" || resArray[1] !== "Bob") {
    throw new Error("toArray string column mismatch");
}

// 2. Empty DataFrame with column
const dfEmpty = new DataFrame({ id: [] });
const emptyArrRes = dfEmpty.toArray("id");
if (!Array.isArray(emptyArrRes) || emptyArrRes.length !== 0) {
    throw new Error("toArray on empty df should be []");
}

// 3. Non-existent column error
let threwMissing = false;
try {
    df.toArray("non_existent" as any);
} catch (e: any) {
    threwMissing = true;
}
if (!threwMissing) {
    throw new Error("toArray with non-existent column should throw ColumnNotFoundError");
}

// 4. TypedArray column converts to plain JS Array (Array.isArray === true)
const dfTypedArr = new DataFrame({
    f64: new Float64Array([1.5, 2.5, 3.5]),
    i32: new Int32Array([-10, 0, 10])
});
const f64Arr = dfTypedArr.toArray("f64");
const i32Arr = dfTypedArr.toArray("i32");
if (!Array.isArray(f64Arr) || f64Arr.length !== 3 || f64Arr[1] !== 2.5) {
    throw new Error("Float64Array toArray conversion failed");
}
if (!Array.isArray(i32Arr) || i32Arr[0] !== -10 || i32Arr[2] !== 10) {
    throw new Error("Int32Array toArray conversion failed");
}

// 5. Nulls and special float values (NaN, Infinity, -Infinity)
const dfSpecial = new DataFrame([
    { v: null },
    { v: NaN },
    { v: Infinity },
    { v: -Infinity }
]);
const specialArr = dfSpecial.toArray("v");
if (
    specialArr[0] !== null ||
    !Number.isNaN(specialArr[1]) ||
    specialArr[2] !== Infinity ||
    specialArr[3] !== -Infinity
) {
    throw new Error("Null / special float values in toArray failed");
}

// 6. BigInt and Date values preserved
const d1 = new Date("2026-01-01T00:00:00.000Z");
const d2 = new Date("2026-06-15T12:30:00.000Z");
const dfRich = new DataFrame([
    { big: 9007199254740993n, dt: d1 },
    { big: -123456789012345n, dt: d2 }
]);
const bigArr = dfRich.toArray("big");
const dtArr = dfRich.toArray("dt");
if (bigArr[0] !== 9007199254740993n || bigArr[1] !== -123456789012345n) {
    throw new Error("BigInt values in toArray failed");
}
if (!(dtArr[0] instanceof Date) || dtArr[0].getTime() !== d1.getTime() || dtArr[1].getTime() !== d2.getTime()) {
    throw new Error("Date values in toArray failed");
}

// 7. Empty DataFrame (height === 0) returns empty array []
const dfEmpty2 = new DataFrame({ a: [] as number[], b: [] as string[] });
const emptyArr = dfEmpty2.toArray("a");
if (!Array.isArray(emptyArr) || emptyArr.length !== 0) {
    throw new Error("Empty DataFrame toArray should return []");
}

// 8. Complex expression & aggregation expression
const dfExprs = new DataFrame([
    { a: 2, b: 10 },
    { a: 3, b: 20 }
]);
const computedArr = dfExprs.toArray($df.col("a").mul(2).add($df.col("b")));
if (computedArr[0] !== 14 || computedArr[1] !== 26) {
    throw new Error(`Computed expression toArray failed: ${JSON.stringify(computedArr)}`);
}
const aggArr = dfExprs.toArray($df.col("a").sum());
if (aggArr.length !== 1 || aggArr[0] !== 5) {
    throw new Error(`Aggregation expression toArray failed: ${JSON.stringify(aggArr)}`);
}

// 9. Immutability: mutating returned array does not mutate DataFrame
const copyArr = dfExprs.toArray("a");
copyArr[0] = 9999;
if (dfExprs.item(0, "a") !== 2) {
    throw new Error("Mutating toArray() result mutated the underlying DataFrame");
}

// 10. Non-existent column throws error
let threwMissing2 = false;
try {
    dfExprs.toArray("missing" as any);
} catch {
    threwMissing2 = true;
}
if (!threwMissing2) {
    throw new Error("Expected toArray on non-existent column to throw");
}

console.log("✓ toArray tests passed!");
