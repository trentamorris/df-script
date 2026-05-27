import { DataFrame } from "../../dataframe";

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
const dfInner = left.join(right, "id", "inner");

if (dfInner.height !== 1) throw new Error("Inner join height mismatch");
if (dfInner.collect()[0].val !== "L1" || dfInner.collect()[0].rval !== "R1") {
    throw new Error("Inner join values mismatch");
}

// 2. Left Join
const dfLeft = left.join(right, "id", "left");
if (dfLeft.height !== 2) throw new Error("Left join height mismatch");
const collectedLeft = dfLeft.collect() as any[];
if (collectedLeft[1].val !== "L2" || collectedLeft[1].rval !== null) {
    throw new Error("Left join values mismatch");
}

console.log("✓ join tests passed!");

