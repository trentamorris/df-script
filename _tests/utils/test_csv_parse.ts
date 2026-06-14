import { parseCSV, inferAndCoerceCSVColumn } from "../../src/utils/csv";
import { Float64, Boolean as BoolType } from "../../src/datatypes";

console.log("=========================================");
console.log("STARTING CSV PARSING TESTS...");
console.log("=========================================");

try {
    // 1. Test basic parsing
    const basicCsv = `a,b,c\n1,2,3\n4,5,6`;
    const basicRows = parseCSV(basicCsv);
    if (basicRows.length !== 3 || basicRows[0][0] !== "a" || basicRows[2][2] !== "6") {
        throw new Error("Basic CSV parsing failed");
    }
    console.log("✓ Basic CSV parsing passed!");

    // 2. Test quotes and escaped quotes
    const quoteCsv = `name,message\n"Smith, John","He said ""Hello"""`;
    const quoteRows = parseCSV(quoteCsv);
    if (quoteRows[1][0] !== "Smith, John" || quoteRows[1][1] !== 'He said "Hello"') {
        throw new Error(`Quoted CSV parsing failed: ${JSON.stringify(quoteRows)}`);
    }
    console.log("✓ Quoted fields parsing passed!");

    // 3. Test newlines in quotes
    const newlineCsv = `"a","line1\nline2"\n"b","c"`;
    const newlineRows = parseCSV(newlineCsv);
    if (newlineRows[0][1] !== "line1\nline2" || newlineRows.length !== 2) {
        throw new Error("Newlines inside quotes failed");
    }
    console.log("✓ Newlines inside quotes passed!");

    // 4. Test inference
    const numCol = inferAndCoerceCSVColumn(["1", "2.5", "NaN", ""]);
    if (numCol.type !== Float64 || numCol.values[1] !== 2.5 || numCol.values[3] !== null) {
        throw new Error("Number column inference failed");
    }
    console.log("✓ Number inference passed!");

    const boolCol = inferAndCoerceCSVColumn(["true", "False", "1", "0"]);
    if (boolCol.type !== BoolType || boolCol.values[0] !== true || boolCol.values[3] !== false) {
        throw new Error("Boolean column inference failed");
    }
    console.log("✓ Boolean inference passed!");
    
    console.log("\n🎉 ALL CSV PARSING TESTS PASSED SUCCESSFULLY!");
} catch (e: any) {
    console.error(`\n❌ TEST FAILED: ${e.message}`);
    process.exit(1);
}
