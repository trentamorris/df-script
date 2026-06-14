import { DataFrame } from "../../src/index";
import { formatCsvValue } from "../../src/utils";
import * as fs from "fs";
import * as path from "path";

console.log("=========================================");
console.log("STARTING DATAFRAME CSV WRITE TESTS...");
console.log("=========================================");

try {
    const df = new DataFrame([
        { id: 1, name: "Alice", note: "Hello, world!", score: 95.1234, extra: null },
        { id: 2, name: "Bob", note: 'He said "hello!"', score: 88.0, extra: "yes" },
        { id: 3, name: "Charlie", note: "Line 1\nLine 2", score: null, extra: null }
    ]);

    // Test formatCsvValue standalone
    if (formatCsvValue({ nullValue: "N/A" })(null) !== "N/A") {
        throw new Error("formatCsvValue failed to format nulls");
    }
    if (formatCsvValue({ numericFormatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 } })(123.456) !== "123.46") {
        throw new Error("formatCsvValue failed to format float precision");
    }
    if (formatCsvValue({ numericFormatOptions: { locale: "de-DE" } })(123.456) !== "123,456") {
        throw new Error("formatCsvValue failed to format decimal comma");
    }
    if (formatCsvValue()(new Number(1.5)) !== "1.5" || formatCsvValue({ numericFormatOptions: { locale: "de-DE" } })(new Number(1.5)) !== "1,5") {
        throw new Error("formatCsvValue failed to format boxed Number");
    }
    if (formatCsvValue()(new String("wrapper")) !== "wrapper") {
        throw new Error("formatCsvValue failed to format boxed String");
    }
    if (formatCsvValue()(new Boolean(false)) !== "false") {
        throw new Error("formatCsvValue failed to format boxed Boolean");
    }
    if (formatCsvValue()(12345n) !== "12345") {
        throw new Error("formatCsvValue failed to format BigInt");
    }
    if (formatCsvValue()(new Set([1, 2])) !== "[1,2]") {
        throw new Error("formatCsvValue failed to format Set");
    }
    if (formatCsvValue()(new Map([["a", 1]])) !== '[["a",1]]') {
        throw new Error("formatCsvValue failed to format Map");
    }
    if (formatCsvValue()(/foo/i) !== "/foo/i") {
        throw new Error("formatCsvValue failed to format RegExp");
    }
    if (formatCsvValue()({ nested: 9876543210n }) !== '{"nested":"9876543210"}') {
        throw new Error("formatCsvValue failed to format nested BigInt in object");
    }
    if (formatCsvValue({ datetimeFormat: "%Y-%m-%d %H:%M:%S" })(new Date("2026-06-14T12:34:56Z")) !== "2026-06-14 12:34:56") {
        throw new Error("formatCsvValue failed to format Date with datetimeFormat");
    }

    // 1. Test standard write_csv (string output, auto-quotes, headers)
    const csvStr = df.write_csv();
    if (typeof csvStr !== "string") throw new Error("write_csv output was not a string");
    
    const lines = csvStr.split("\n");
    // Expected 5 lines due to the embedded newline in Charlie's note splitting the split output.
    if (lines.length !== 5) throw new Error("Expected 5 lines in CSV output (due to embedded newline)");
    if (lines[0] !== "id,name,note,score,extra") throw new Error("Header line mismatch");
    if (lines[1] !== '1,Alice,"Hello, world!",95.1234,') throw new Error("Normal quoting failed");
    if (lines[2] !== '2,Bob,"He said ""hello!""",88,yes') throw new Error("Escaped quote handling failed");
    
    const rawCSV = df.write_csv();
    if (!rawCSV.includes('"Line 1\nLine 2"')) throw new Error("Embedded newline quoting failed");

    // 2. Test headers: false (or includeHeader: false)
    const noHeaderCSV = df.write_csv(undefined, { includeHeader: false });
    if (noHeaderCSV.includes("id,name,note")) throw new Error("Headers found when includeHeader option is false");

    // 3. Test quoteStyle: "always"
    const alwaysQuoted = df.write_csv(undefined, { quoteStyle: "always" });
    const alwaysLines = alwaysQuoted.split("\n");
    if (alwaysLines[0] !== '"id","name","note","score","extra"') {
        throw new Error("quoteStyle: always failed for headers");
    }
    if (alwaysLines[1] !== '"1","Alice","Hello, world!","95.1234",""') {
        throw new Error("quoteStyle: always failed for data row");
    }

    // 4. Test quoteStyle: "never"
    const neverQuoted = df.write_csv(undefined, { quoteStyle: "never" });
    const neverLines = neverQuoted.split("\n");
    if (neverLines[2] !== '2,Bob,He said "hello!",88,yes') {
        throw new Error("quoteStyle: never failed to output raw unescaped values");
    }

    // 4b. Test quoteStyle: "non_numeric"
    const nonNumericQuoted = df.write_csv(undefined, { quoteStyle: "non_numeric" });
    const nonNumericLines = nonNumericQuoted.split("\n");
    if (nonNumericLines[0] !== '"id","name","note","score","extra"') {
        throw new Error("quoteStyle: non_numeric failed for headers");
    }
    if (nonNumericLines[1] !== '1,"Alice","Hello, world!",95.1234,') {
        throw new Error("quoteStyle: non_numeric failed for data row");
    }

    // 5. Test nullValue
    const customNulls = df.write_csv(undefined, { nullValue: "N/A" });
    if (!customNulls.includes(",N/A") || !customNulls.includes(",N/A,N/A")) {
        throw new Error("nullValue: custom value failed");
    }

    // 6. Test float precision
    const preciseQuoted = df.write_csv(undefined, { numericFormatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 } });
    if (!preciseQuoted.includes(",95.12,")) {
        throw new Error("numericFormatOptions: custom decimal places failed");
    }

    // 7. Test includeBom
    const bomStr = df.write_csv(undefined, { includeBom: true });
    if (!bomStr.startsWith("\ufeff")) {
        throw new Error("includeBom: missing Byte Order Mark");
    }

    // 8. Test lineTerminator
    const crlfStr = df.write_csv(undefined, { lineTerminator: "\r\n" });
    if (!crlfStr.includes("\r\n")) {
        throw new Error("lineTerminator: custom CR-LF line endings failed");
    }

    // 9. Test writing to a file path
    const tempFilePath = path.join(__dirname, "temp_test_output.csv");
    if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
    }
    df.write_csv(tempFilePath);
    if (!fs.existsSync(tempFilePath)) throw new Error("write_csv to file path failed: file does not exist");
    const fileContent = fs.readFileSync(tempFilePath, "utf8");
    if (!fileContent.includes("Alice") || !fileContent.includes("Bob")) {
        throw new Error("write_csv file content mismatch");
    }
    fs.unlinkSync(tempFilePath);

    // 10. Test writing to a writable-like object (with .write method)
    let writtenStr = "";
    const mockWritable = {
        write(str: string) {
            writtenStr += str;
        }
    };
    df.write_csv(mockWritable);
    if (!writtenStr.includes("Alice") || !writtenStr.includes("Bob")) {
        throw new Error("write_csv to writable-like object failed");
    }

    // 11. Test error handling for invalid file argument
    let errorThrown = false;
    try {
        df.write_csv(123 as any);
    } catch (err: any) {
        errorThrown = true;
        if (!err.message.includes("Invalid file argument")) {
            throw new Error("Wrong error message for invalid file argument");
        }
    }
    if (!errorThrown) throw new Error("write_csv failed to throw on invalid file argument");

    // 12. Test replacerOptions: onBigInt override in write_csv
    const dfBigInt = new DataFrame([{ id: 1, val: 100n }]);
    const csvBigInt = dfBigInt.write_csv(undefined, {
        replacerOptions: {
            onBigInt: (b) => `${b}n`
        }
    });
    if (!csvBigInt.includes("100n")) {
        throw new Error("write_csv onBigInt override failed");
    }

    // 13. Test replacerOptions: onSet override in write_csv
    const dfSet = new DataFrame([{ id: 1, val: new Set(["foo", "bar"]) }]);
    const csvSet = dfSet.write_csv(undefined, {
        replacerOptions: {
            onSet: (s) => Array.from(s).join("|")
        }
    });
    if (!csvSet.includes("foo|bar")) {
        throw new Error("write_csv onSet override failed");
    }

    // 14. Test replacerOptions: onCustom override for arbitrary classes in write_csv
    class CustomVal {
        constructor(public text: string) {}
    }
    const dfCustom = new DataFrame([{ id: 1, val: new CustomVal("testing") }]);
    const csvCustom = dfCustom.write_csv(undefined, {
        replacerOptions: {
            onCustom: (_, v) => (v instanceof CustomVal ? `Custom[${v.text}]` : v)
        }
    });
    if (!csvCustom.includes("Custom[testing]")) {
        throw new Error("write_csv onCustom override failed");
    }

    // 15. Test nested objects/arrays safe serialization inside CSV fields
    const dfNested = new DataFrame([{ id: 1, val: { innerBig: 12345n, innerSet: new Set(["a"]) } }]);
    const csvNested = dfNested.write_csv(undefined, {
        replacerOptions: {
            onBigInt: (b) => `${b}Big`,
            onSet: (s) => Array.from(s).map(x => x + "Set")
        }
    });
    if (!csvNested.includes('"{""innerBig"":""12345Big"",""innerSet"":[""aSet""]}"')) {
        throw new Error(`write_csv nested replacerOptions failed: ${csvNested}`);
    }

    console.log("\n🎉 ALL DATAFRAME CSV WRITE TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ DataFrame CSV WRITE TESTS FAILED:", err);
    process.exit(1);
}
