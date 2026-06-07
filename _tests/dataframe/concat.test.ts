import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src";

console.log("Running concat tests...");

const df1 = new DataFrame([{ id: 1, name: "Alice" }]);
const df2 = new DataFrame([{ id: 2, name: "Bob" }]);

// 1. Vertical Concat (Top-Level)
const dfVert = $df.concat([df1, df2], { how: "vertical" });
if (dfVert.height !== 2) throw new Error("Vertical concat height mismatch");
const collectedVert = dfVert.to_dicts();
if (collectedVert[1].name !== "Bob") throw new Error("Vertical concat value mismatch");

// 2. Horizontal Concat (Instance-Level, verifying that 'this' is prepended)
const df3 = new DataFrame([{ age: 25 }]);
const dfHoriz = df1.concat([df3], { how: "horizontal" });
if (dfHoriz.height !== 1) throw new Error("Horizontal concat height mismatch");
const collectedHoriz = dfHoriz.to_dicts() as any[];
if (collectedHoriz[0].age !== 25 || collectedHoriz[0].name !== "Alice") {
    throw new Error("Horizontal concat values mismatch");
}

// 3. Diagonal Concat (Top-Level)
const df4 = new DataFrame([{ age: 30, city: "Paris" }]);
const dfDiag = $df.concat([df1, df4], { how: "diagonal" });
if (dfDiag.height !== 2) throw new Error("Diagonal concat height mismatch");
const collectedDiag = dfDiag.to_dicts() as any[];
if (collectedDiag[0].age !== null || collectedDiag[1].name !== null || collectedDiag[1].city !== "Paris") {
    throw new Error("Diagonal concat values mismatch");
}

// 4. Horizontal Concat Strictness Options
const dfHorizShort = new DataFrame([{ val: "X" }]);
const dfHorizTall = new DataFrame([{ other: 10 }, { other: 20 }]);

let didThrow = false;
try {
    $df.concat([dfHorizShort, dfHorizTall], { how: "horizontal", horizontal: { strict: true } });
} catch (e: any) {
    if (e.message.includes("Row count mismatch")) {
        didThrow = true;
    }
}
if (!didThrow) throw new Error("Expected horizontal strict check to throw on height mismatch");

const dfHorizPadded = $df.concat([dfHorizShort, dfHorizTall], { how: "horizontal", horizontal: { strict: false } });
if (dfHorizPadded.height !== 2) throw new Error("Padded horizontal concat should have height of tallest DataFrame");
const collectedHorizPadded = dfHorizPadded.to_dicts() as any[];
if (collectedHorizPadded[0].val !== "X" || collectedHoriz[0].age !== 25) {
    // Wait, let's verify collectedHorizPadded values:
    // dfHorizShort has val="X", dfHorizTall has other=10, 20
    // so row 0: val="X", other=10
    // row 1: val=null, other=20
}
if (collectedHorizPadded[0].val !== "X" || collectedHorizPadded[0].other !== 10) {
    throw new Error("Padded horizontal concat row 0 mismatch");
}
if (collectedHorizPadded[1].val !== null || collectedHorizPadded[1].other !== 20) {
    throw new Error("Padded horizontal concat row 1 mismatch");
}

// 5. vstack and hstack wrappers
const dfV1 = df1.vstack(df2);
if (dfV1.height !== 2) throw new Error("vstack with DataFrame height mismatch");
if (dfV1.to_dicts()[1].name !== "Bob") throw new Error("vstack with DataFrame value mismatch");

const dfV2 = df1.vstack([df2]);
if (dfV2.height !== 2) throw new Error("vstack with array of DataFrames height mismatch");

const dfV3 = df1.vstack([{ id: 2, name: "Bob" }]);
if (dfV3.height !== 2) throw new Error("vstack with raw row objects height mismatch");
if (dfV3.to_dicts()[1].name !== "Bob") throw new Error("vstack with raw row objects value mismatch");

const dfH1 = df1.hstack(df3);
if (dfH1.height !== 1) throw new Error("hstack with DataFrame height mismatch");
if ((dfH1.to_dicts() as any[])[0].age !== 25) throw new Error("hstack with DataFrame value mismatch");

const dfH2 = df1.hstack({ age: [25] });
if (dfH2.height !== 1) throw new Error("hstack with columns object height mismatch");
if ((dfH2.to_dicts() as any[])[0].age !== 25) throw new Error("hstack with columns object value mismatch");

// 5b. hstack options test
let didThrowHStack = false;
try {
    dfHorizShort.hstack(dfHorizTall, { strict: true });
} catch (e: any) {
    if (e.message.includes("Row count mismatch")) {
        didThrowHStack = true;
    }
}
if (!didThrowHStack) throw new Error("Expected hstack with strict=true to throw on height mismatch");

const dfH3 = dfHorizShort.hstack(dfHorizTall, { strict: false });
if (dfH3.height !== 2) throw new Error("Padded hstack should have height of tallest DataFrame");
const collectedH3 = dfH3.to_dicts() as any[];
if (collectedH3[0].val !== "X" || collectedH3[0].other !== 10) {
    throw new Error("Padded hstack row 0 mismatch");
}

// 6. Generalized concat input tests
const dfGen1 = $df.concat(df1);
if (dfGen1.height !== 1 || dfGen1.to_dicts()[0].name !== "Alice") {
    throw new Error("Generalized concat with single DataFrame failed");
}

const dfGen2 = df1.concat({ age: [25] }, { how: "horizontal" });
if (dfGen2.height !== 1 || (dfGen2.to_dicts() as any[])[0].age !== 25) {
    throw new Error("Generalized instance concat with columns object failed");
}

const dfGen3 = df1.concat([{ id: 2, name: "Bob" }], { how: "vertical" });
if (dfGen3.height !== 2 || dfGen3.to_dicts()[1].name !== "Bob") {
    throw new Error("Generalized instance concat with raw row objects failed");
}

const dfGen4 = $df.concat([df1, { id: [2], name: ["Bob"] }], { how: "diagonal" });
if (dfGen4.height !== 2 || dfGen4.to_dicts()[1].name !== "Bob") {
    throw new Error("Generalized top-level concat with mixed items failed");
}

// 7. Defensive verification
let threw = false;
try {
    $df.concat(null as any);
} catch (e: any) {
    if (e.message.includes("cannot be null or undefined")) threw = true;
}
if (!threw) throw new Error("Expected concat(null) to throw");

threw = false;
try {
    $df.concat([df1, null as any]);
} catch (e: any) {
    if (e.message.includes("cannot be null or undefined")) threw = true;
}
if (!threw) throw new Error("Expected concat([df, null]) to throw");

threw = false;
try {
    $df.concat([[df1, {} as any]]);
} catch (e: any) {
    if (e.message.includes("must contain only DataFrame instances")) threw = true;
}
if (!threw) throw new Error("Expected nested array with non-DataFrame to throw");

threw = false;
try {
    $df.concat([[1, 2, 3] as any]);
} catch (e: any) {
    if (e.message.includes("rows must be plain objects")) threw = true;
}
if (!threw) throw new Error("Expected row array with non-objects to throw");

threw = false;
try {
    $df.concat("invalid" as any);
} catch (e: any) {
    if (e.message.includes("expected DataFrame")) threw = true;
}
if (!threw) throw new Error("Expected invalid input type to throw");

console.log("✓ concat tests passed!");

