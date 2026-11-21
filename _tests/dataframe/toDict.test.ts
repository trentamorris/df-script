import { DataFrame } from "df-script";

console.log("Running toDict tests...");

const df = new DataFrame([
    { a: 1, b: "x" },
    { a: 2, b: "y" }
]);

// 1. Column arrays dictionary
const dict = df.toDict();
if (!dict.a || !dict.b || dict.a.length !== 2 || dict.b.length !== 2) {
    throw new Error("toDict structure mismatch");
}
if (dict.a[0] !== 1 || dict.a[1] !== 2 || dict.b[0] !== "x" || dict.b[1] !== "y") {
    throw new Error("toDict values mismatch");
}

console.log("✓ toDict tests passed!");
