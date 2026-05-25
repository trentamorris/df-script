import { DataFrame } from "../dataframe";

console.log("Running concat tests...");

const df1 = new DataFrame([{ id: 1, name: "Alice" }]);
const df2 = new DataFrame([{ id: 2, name: "Bob" }]);

// 1. Vertical Concat
const dfVert = df1.concat([df1, df2], { how: "vertical" });
if (dfVert.height !== 2) throw new Error("Vertical concat height mismatch");
const collectedVert = dfVert.collect();
if (collectedVert[1].name !== "Bob") throw new Error("Vertical concat value mismatch");

// 2. Horizontal Concat
const df3 = new DataFrame([{ age: 25 }]);
const dfHoriz = df1.concat([df1, df3], { how: "horizontal" });
if (dfHoriz.height !== 1) throw new Error("Horizontal concat height mismatch");
const collectedHoriz = dfHoriz.collect() as any[];
if (collectedHoriz[0].age !== 25 || collectedHoriz[0].name !== "Alice") {
    throw new Error("Horizontal concat values mismatch");
}

// 3. Diagonal Concat
const df4 = new DataFrame([{ age: 30, city: "Paris" }]);
const dfDiag = df1.concat([df1, df4], { how: "diagonal" });
if (dfDiag.height !== 2) throw new Error("Diagonal concat height mismatch");
const collectedDiag = dfDiag.collect() as any[];
if (collectedDiag[0].age !== null || collectedDiag[1].name !== null || collectedDiag[1].city !== "Paris") {
    throw new Error("Diagonal concat values mismatch");
}

console.log("✓ concat tests passed!");
