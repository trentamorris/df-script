import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION $df.all() TESTS...");
console.log("=========================================");

try {
    const df = $df.data({
        a: [1, 2, 3],
        b: [4, 5, 6],
        c: ["x", "y", "z"]
    });

    // 1. Basic df.select($df.all())
    const resAll = df.select($df.all()).toDicts();
    if (resAll.length !== 3) throw new Error("resAll length mismatch");
    if (resAll[0].a !== 1 || resAll[0].b !== 4 || resAll[0].c !== "x") {
        throw new Error("Basic $df.all() failed: " + JSON.stringify(resAll));
    }

    // 2. $df.all() in array of selectors
    const resArray = df.select([$df.all()]).toDicts();
    if (resArray.length !== 3 || resArray[1].b !== 5) {
        throw new Error("$df.all() in array failed: " + JSON.stringify(resArray));
    }

    console.log("✓ $df.all() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.all() tests failed:", err);
}
