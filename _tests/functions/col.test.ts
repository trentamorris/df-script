declare const process: any;
import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING $df.col() TESTS...");
console.log("=========================================");

try {
    const df = $df.data({
        numA: [1, 2],
        numB: [10, 20],
        label: ["x", "y"]
    });

    // 1. Single column by name
    const single = df.select($df.col("numA")).toDicts();
    if (single.length !== 2 || single[0].numA !== 1 || single[1].numA !== 2 || ("numB" in single[0])) {
        throw new Error("Single column selector failed: " + JSON.stringify(single));
    }

    // 2. Multiple columns by string array
    const multi = df.select($df.col(["numA", "label"])).toDicts();
    if (multi.length !== 2 || multi[0].numA !== 1 || multi[0].label !== "x" || ("numB" in multi[0])) {
        throw new Error("Multi-column array selector failed: " + JSON.stringify(multi));
    }

    // 3. RegExp pattern selector
    const regexRes = df.select($df.col(/^num/)).toDicts();
    if (regexRes.length !== 2 || regexRes[0].numA !== 1 || regexRes[0].numB !== 10 || ("label" in regexRes[0])) {
        throw new Error("RegExp column selector failed: " + JSON.stringify(regexRes));
    }

    // 4. DataType selector
    const dtypeRes = df.select($df.col($df.Utf8)).toDicts();
    if (dtypeRes.length !== 2 || dtypeRes[0].label !== "x" || ("numA" in dtypeRes[0])) {
        throw new Error("DataType column selector failed: " + JSON.stringify(dtypeRes));
    }

    console.log("✓ $df.col() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.col() tests failed:", err);
    process.exit(1);
}

