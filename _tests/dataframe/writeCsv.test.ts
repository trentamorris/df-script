import { DataFrame } from "../../src/dataframe";

console.log("Running writeCsv tests...");

const df = new DataFrame([
    { name: "Alice", score: 95 },
    { name: "Bob", score: 80 }
]);

// 1. Basic CSV string output
const csvStr = df.writeCsv();
if (!csvStr.includes("name,score") || !csvStr.includes("Alice,95") || !csvStr.includes("Bob,80")) {
    throw new Error("Basic writeCsv output mismatch");
}

// 2. Custom separator / delimiter
const tsvStr = df.writeCsv(undefined, { separator: "\t" });
if (!tsvStr.includes("name\tscore") || !tsvStr.includes("Alice\t95")) {
    throw new Error("TSV separator output mismatch");
}

// 3. Header toggle (includeHeader: false)
const noHeaderStr = df.writeCsv(undefined, { includeHeader: false });
if (noHeaderStr.includes("name,score")) {
    throw new Error("includeHeader false should omit column names");
}

// 4. quoteStyle: "always"
const alwaysQuotedDf = df.writeCsv(undefined, { quoteStyle: "always" });
if (!alwaysQuotedDf.startsWith('"name","score"') || !alwaysQuotedDf.includes('"Alice","95"')) {
    throw new Error("df.writeCsv quoteStyle 'always' failed: " + alwaysQuotedDf);
}

// 5. quoteStyle: "never" with commas in values
const commaDf = new DataFrame([{ text: "hello, world", num: 1 }]);
const neverQuotedDf = commaDf.writeCsv(undefined, { quoteStyle: "never" });
if (neverQuotedDf.includes('"hello, world"')) {
    throw new Error("df.writeCsv quoteStyle 'never' should not quote: " + neverQuotedDf);
}

// 6. Null and undefined value representation (nullValue: "NA")
const nullDf = new DataFrame([
    { a: 1, b: null },
    { a: undefined, b: "ok" }
]);
const nullCsv = nullDf.writeCsv(undefined, { nullValue: "NA" });
if (!nullCsv.includes("1,NA") || !nullCsv.includes("NA,ok")) {
    throw new Error("df.writeCsv nullValue failed: " + nullCsv);
}

// 7. Custom Date, BigInt, and number formatting via WriteCSVOptions
const complexDf = new DataFrame([
    { date: new Date("2026-06-15T12:00:00Z"), big: 1000000n, floatVal: 123.456 }
]);
const formattedCsv = complexDf.writeCsv(undefined, {
    datetimeFormat: "%Y/%m/%d",
    numericFormatOptions: { locale: "de-DE", useGrouping: true }
});
if (!formattedCsv.includes("2026/06/15") || !formattedCsv.includes("1.000.000") || !formattedCsv.includes('"123,456"')) {
    throw new Error("df.writeCsv custom formatting options failed: " + formattedCsv);
}

// 8. Nested JSON structs and arrays
const nestedDf = new DataFrame([
    { user: { id: 1, roles: ["admin", "editor"] }, active: true }
]);
const nestedCsv = nestedDf.writeCsv();
if (!nestedCsv.includes('"{""id"":1,""roles"":[""admin"",""editor""]}",true')) {
    throw new Error("df.writeCsv nested struct/array serialization failed: " + nestedCsv);
}

// 9. BOM output (includeBom: true)
const bomCsv = df.writeCsv(undefined, { includeBom: true });
if (!bomCsv.startsWith("\ufeff")) {
    throw new Error("df.writeCsv includeBom failed");
}

// 10. Streaming to writable stream object
const chunks: string[] = [];
const mockStream = {
    write: (s: string) => { chunks.push(s); }
};
const res = df.writeCsv(mockStream, { lineTerminator: "\n" });
if (res !== "" || chunks.length !== 3 || chunks[0] !== "name,score") {
    throw new Error("df.writeCsv stream writing failed");
}

// 11. Empty DataFrame (0 rows, headers preserved from columns dict)
const emptyDf = new DataFrame({ x: [], y: [] });
const emptyCsv = emptyDf.writeCsv();
if (emptyCsv !== "x,y") {
    throw new Error("df.writeCsv 0-row header output failed: " + emptyCsv);
}

// 12. quoteStyle: "non_numeric" on DataFrame with mixed types
const mixedDf = new DataFrame([
    { id: 42, active: true, tag: "verified", ratio: 0.75 }
]);
const nonNumCsv = mixedDf.writeCsv(undefined, { quoteStyle: "non_numeric" });
if (!nonNumCsv.includes('42,"true","verified",0.75')) {
    throw new Error("df.writeCsv quoteStyle 'non_numeric' failed: " + nonNumCsv);
}

console.log("✓ writeCsv tests passed!");
