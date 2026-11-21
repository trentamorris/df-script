import { DataFrame } from "df-script";

console.log("Running head tests...");

const df = new DataFrame([
    { val: 1 },
    { val: 2 },
    { val: 3 },
    { val: 4 },
    { val: 5 }
]);

// 1. Default head (5 rows)
const dfHeadDefault = df.head();
if (dfHeadDefault.height !== 5) throw new Error("Default head height mismatch");

// 2. Custom n
const dfHead2 = df.head(2);
if (dfHead2.height !== 2) throw new Error("head(2) height mismatch");
const rows2 = dfHead2.toDicts();
if (rows2[0].val !== 1 || rows2[1].val !== 2) throw new Error("head(2) values mismatch");

// 3. n > height
const dfHead10 = df.head(10);
if (dfHead10.height !== 5) throw new Error("head(10) height mismatch");

// 4. n = 0
const dfHead0 = df.head(0);
if (dfHead0.height !== 0) throw new Error("head(0) height mismatch");

console.log("✓ head tests passed!");
