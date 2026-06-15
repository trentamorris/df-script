import { DataFrame } from "../../src/dataframe";

console.log("Running join tests...");

const left = new DataFrame([
    { id: 1, val: "L1" },
    { id: 2, val: "L2" }
]);

const right = new DataFrame([
    { id: 1, rval: "R1" },
    { id: 3, rval: "R3" }
]);

// 1. Inner Join
const dfInner = left.join({ other: right, on: "id", how: "inner" });

if (dfInner.height !== 1) throw new Error("Inner join height mismatch");
if (dfInner.to_dicts()[0].val !== "L1" || dfInner.to_dicts()[0].rval !== "R1") {
    throw new Error("Inner join values mismatch");
}

// 2. Left Join
const dfLeft = left.join({ other: right, on: "id", how: "left" });
if (dfLeft.height !== 2) throw new Error("Left join height mismatch");
const collectedLeft = dfLeft.to_dicts() as any[];
if (collectedLeft[1].val !== "L2" || collectedLeft[1].rval !== null) {
    throw new Error("Left join values mismatch");
}

// 3. Semi Join
const dfSemi = left.join({ other: right, on: "id", how: "semi" });
if (dfSemi.height !== 1) throw new Error("Semi join height mismatch");
const collectedSemi = dfSemi.to_dicts() as any[];
if (collectedSemi[0].val !== "L1" || "rval" in collectedSemi[0]) {
    throw new Error("Semi join values or columns mismatch");
}

// 4. Anti Join
const dfAnti = left.join({ other: right, on: "id", how: "anti" });
if (dfAnti.height !== 1) throw new Error("Anti join height mismatch");
const collectedAnti = dfAnti.to_dicts() as any[];
if (collectedAnti[0].val !== "L2" || "rval" in collectedAnti[0]) {
    throw new Error("Anti join values or columns mismatch");
}

console.log("✓ join tests passed!");

