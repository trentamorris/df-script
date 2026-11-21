declare const process: any;
import { DataFrame, $df } from "df-script";

console.log("Running DataFrame.cast tests...");

// 1. Cast all columns to Float64 ($df.Float64)
const df1 = new DataFrame({
    a: [1, 2, 3],
    b: [4, 5, 6]
});

const res1 = df1.cast($df.Float64);
if (res1.schema.a !== $df.Float64 || res1.schema.b !== $df.Float64) {
    throw new Error("Cast all columns to Float64 failed schema check");
}
const dicts1 = res1.toDicts();
if (dicts1[0].a !== 1.0 || dicts1[2].b !== 6.0) {
    throw new Error("Cast all columns to Float64 failed values check");
}

// 2. Cast specific columns via object mapping ({ id: $df.UInt32, score: $df.Float32 })
const df2 = new DataFrame({
    id: [1, 2, 3],
    score: ["10.5", "20.0", "30.5"],
    name: ["Alice", "Bob", "Charlie"]
});

const res2 = df2.cast({
    id: $df.UInt32,
    score: $df.Float32
});

if (res2.schema.id !== $df.UInt32 || res2.schema.score !== $df.Float32 || res2.schema.name !== $df.Utf8) {
    throw new Error("Cast mapped columns failed schema check");
}
const dicts2 = res2.toDicts();
if (dicts2[0].id !== 1 || dicts2[0].score !== 10.5 || dicts2[0].name !== "Alice") {
    throw new Error("Cast mapped columns failed values check");
}

// 3. Cast with strict: false (safe cast producing null on failure)
const df3 = new DataFrame({
    num_str: ["1", "two", "3"]
});

const res3 = df3.cast({ num_str: $df.Int64 }, { strict: false });
const dicts3 = res3.toDicts();
if (dicts3[0].num_str !== 1n || dicts3[1].num_str !== null || dicts3[2].num_str !== 3n) {
    throw new Error("Cast with strict: false failed values check: " + JSON.stringify(dicts3));
}

// 4. Cast empty dataframe
const dfEmpty = new DataFrame({});
const resEmpty = dfEmpty.cast($df.Int32);
if (resEmpty.height !== 0) {
    throw new Error("Cast empty dataframe failed");
}

console.log("DataFrame.cast tests passed!");
