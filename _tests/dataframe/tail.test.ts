import { DataFrame } from "df-script";

console.log("Running tail tests...");

const df = new DataFrame([
    { val: 1 },
    { val: 2 },
    { val: 3 },
    { val: 4 },
    { val: 5 }
]);

// 1. Default tail (5 rows)
const dfTailDefault = df.tail();
if (dfTailDefault.height !== 5) throw new Error("Default tail height mismatch");

// 2. Custom n
const dfTail2 = df.tail(2);
if (dfTail2.height !== 2) throw new Error("tail(2) height mismatch");
const rows2 = dfTail2.toDicts();
if (rows2[0].val !== 4 || rows2[1].val !== 5) throw new Error("tail(2) values mismatch");

// 3. n > height
const dfTail10 = df.tail(10);
if (dfTail10.height !== 5) throw new Error("tail(10) height mismatch");

// 4. n = 0
const dfTail0 = df.tail(0);
if (dfTail0.height !== 0) throw new Error("tail(0) height mismatch");

console.log("✓ tail tests passed!");
