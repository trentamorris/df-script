declare const process: any;
import { $df } from "df-script";
import { Int64, Utf8, Float64, Boolean as BoolType, Int32 } from "df-script";

console.log("=========================================");
console.log("STARTING DATAFRAME CSV READ TESTS...");
console.log("=========================================");

try {
    const csvContent = `id,name,age,active,score
1,"Alice",30,true,95.5
2,"Bob",25,false,88.0
3,"Charlie",,1,NaN`;

    // 1. Test basic parsing and inference
    const df1 = $df.readCsv(csvContent);
    const schema1 = df1.schema;

    if (schema1.id !== Int64) throw new Error("ID inference failed");
    if (schema1.name !== Utf8) throw new Error("Name inference failed");
    if (schema1.age !== Int64) throw new Error(`Age inference failed: expected Int64, got ${schema1.age?.name}`);
    if (schema1.active !== BoolType) throw new Error("Active inference failed");
    if (schema1.score !== Float64) throw new Error("Score inference failed");

    const rows1 = df1.toDicts();
    if (rows1[0].name !== "Alice") throw new Error("Row 0 name failed");
    if (rows1[2].age !== null) throw new Error("Row 2 age null failed");
    if (rows1[2].active !== true) throw new Error("Row 2 active '1'->true failed");
    if (rows1[2].score !== null) throw new Error("Row 2 score NaN->null failed");

    console.log("✓ Basic parsing and inference passed!");

    // 2. Test explicit schema
    const df2 = $df.readCsv(csvContent, {
        schema: {
            id: Int32,
            name: Utf8,
            age: Int32, // explicit int cast
            active: Int32, // active as int
            score: Utf8 // score as string
        }
    });
    const schema2 = df2.schema;
    if (schema2.id !== Int32) throw new Error("Explicit schema id failed");

    const rows2 = df2.toDicts();
    if (rows2[2].active !== 1) throw new Error("Row 2 active explicit Int32 failed");
    if (rows2[0].score !== "95.5") throw new Error("Row 0 score explicit Utf8 failed");

    console.log("✓ Explicit schema coercion passed!");

    // 3. Test no headers
    const csvNoHeader = `1,"Alice",30\n2,"Bob",25`;
    const df3 = $df.readCsv(csvNoHeader, { hasHeader: false });

    if (df3.columns[0] !== "column_0" || df3.columns[2] !== "column_2") {
        throw new Error("No-header default names failed");
    }

    const rows3 = df3.toDicts();
    if (rows3[0]["column_1"] !== "Alice") throw new Error("No-header row 0 failed");

    console.log("✓ No header parsing passed!");

    // 4. Test empty string input
    const dfEmpty = $df.readCsv("");
    if (dfEmpty.height !== 0 || dfEmpty.width !== 0) {
        throw new Error("Empty string input failed");
    }
    console.log("✓ Empty string input passed!");

    // 5. Test header only (0 data rows)
    const dfHeaderOnly = $df.readCsv("colA,colB,colC");
    if (dfHeaderOnly.height !== 0 || dfHeaderOnly.width !== 3) {
        throw new Error(`Header-only failed: height=${dfHeaderOnly.height}, width=${dfHeaderOnly.width}`);
    }
    if (dfHeaderOnly.columns.join(",") !== "colA,colB,colC") {
        throw new Error("Header-only column names mismatch");
    }
    console.log("✓ Header only input passed!");

    // 6. Test inferSchema: false (keeps all values as string)
    const dfNoInfer = $df.readCsv("a,b\n1,true\n2,false", { inferSchema: false });
    const noInferRows = dfNoInfer.toDicts();
    if (noInferRows[0].a !== "1" || noInferRows[0].b !== "true") {
        throw new Error("inferSchema: false failed to preserve raw strings");
    }
    console.log("✓ inferSchema: false passed!");

    // 7. Test custom separator (delimiter)
    const tsvContent = "name\tage\tcity\nAlice\t30\tNYC\nBob\t25\tLA";
    const dfTsv = $df.readCsv(tsvContent, { separator: "\t" });
    if (dfTsv.height !== 2 || dfTsv.width !== 3) {
        throw new Error("Custom tab delimiter failed");
    }
    if (dfTsv.toDicts()[1].city !== "LA") {
        throw new Error("Custom tab delimiter value mismatch");
    }
    console.log("✓ Custom separator passed!");

    // 8. Test ragged / uneven rows (shorter row has missing columns padded with empty string / coerced null)
    const raggedCsv = "a,b,c\n1,2,3\n4\n5,6";
    const dfRagged = $df.readCsv(raggedCsv);
    if (dfRagged.height !== 3) {
        throw new Error(`Ragged CSV height failed: expected 3, got ${dfRagged.height}`);
    }
    const raggedRows = dfRagged.toDicts();
    if (raggedRows[1].b !== null || raggedRows[1].c !== null) {
        throw new Error("Ragged CSV missing values were not padded or inferred as null properly");
    }
    console.log("✓ Ragged/missing row values passed!");

    // 9. Test multiline text inside quotes and escaped quotes
    const multilineCsv = 'id,note\n1,"Hello\nWorld"\n2,"She said ""Hello"""';
    const dfMulti = $df.readCsv(multilineCsv);
    if (dfMulti.height !== 2) {
        throw new Error(`Multiline quoted CSV height failed: expected 2, got ${dfMulti.height}`);
    }
    const multiRows = dfMulti.toDicts();
    if (multiRows[0].note !== "Hello\nWorld") {
        throw new Error("Multiline quoted text failed");
    }
    if (multiRows[1].note !== 'She said "Hello"') {
        throw new Error('Escaped double quotes failed: got ' + multiRows[1].note);
    }
    console.log("✓ Quoted multiline and escaped quotes passed!");

    // 10. Test single column and trailing newline
    const singleColCsv = "val\n10\n20\n30\n";
    const dfSingle = $df.readCsv(singleColCsv);
    if (dfSingle.height !== 3 || dfSingle.width !== 1) {
        throw new Error(`Single column with trailing newline failed: height=${dfSingle.height}, width=${dfSingle.width}`);
    }
    console.log("✓ Single column with trailing newline passed!");

    // 11. CRLF (\r\n) line endings
    const dfCrlf = $df.readCsv("a,b\r\n1,x\r\n2,y\r\n");
    if (dfCrlf.height !== 2 || dfCrlf.toDicts()[1].b !== "y") {
        throw new Error("11: CRLF line endings failed");
    }

    // 12. Unicode and emoji values
    const dfUnicode = $df.readCsv("city,emoji\n東京,🚀\nMünchen,✨");
    if (dfUnicode.height !== 2 || dfUnicode.toDicts()[0].city !== "東京" || dfUnicode.toDicts()[1].emoji !== "✨") {
        throw new Error("12: Unicode/emoji values failed");
    }

    // 13. Tab-separated (TSV)
    const dfTsv2 = $df.readCsv("a\tb\n1\tx\n2\ty", { separator: "\t" });
    if (dfTsv2.height !== 2 || dfTsv2.toDicts()[0].b !== "x") {
        throw new Error("13: TSV failed");
    }

    // 14. Quoted fields containing commas
    const dfQuotedComma = $df.readCsv('name,note\n"Doe, Jane","a, b, c"');
    if (dfQuotedComma.toDicts()[0].name !== "Doe, Jane" || dfQuotedComma.toDicts()[0].note !== "a, b, c") {
        throw new Error("14: Quoted commas failed");
    }

    // 15. Boolean column inference
    const dfBool = $df.readCsv("flag\ntrue\nfalse\ntrue");
    if (dfBool.toDicts()[0].flag !== true || dfBool.toDicts()[1].flag !== false) {
        throw new Error("15: Boolean inference failed");
    }

    // 16. Mixed int and float column inference
    const dfFloat = $df.readCsv("n\n1\n2.5\n3");
    if (dfFloat.toDicts()[0].n !== 1 || dfFloat.toDicts()[1].n !== 2.5) {
        throw new Error("16: Mixed int/float inference failed");
    }

    // 17. Empty cells in numeric column
    const dfEmptyCells = $df.readCsv("a,b\n1,\n,2");
    if (dfEmptyCells.height !== 2) {
        throw new Error("17: Empty cells height mismatch");
    }

    // 18. Whitespace-only input
    const dfWs = $df.readCsv("   \n  ");
    if (dfWs.width === 0 && dfWs.height !== 0) {
        throw new Error("18: Whitespace-only CSV failed");
    }

    console.log("\n🎉 ALL DATAFRAME CSV READ TESTS PASSED SUCCESSFULLY!");
} catch (e: any) {
    console.error(`\n❌ DATAFRAME CSV READ TEST FAILED: ${e.message}`);
    process.exit(1);
}
