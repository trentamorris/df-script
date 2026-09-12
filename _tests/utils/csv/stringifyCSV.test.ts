declare const process: any;
import { stringifyCSV } from "../../../src/utils/csv";

try {
    const columns = {
        id: [1, 2, 3],
        name: ["Alice", "Bob", "Charlie"],
        note: ["Hello, world!", 'He said "hello!"', "Line 1\nLine 2"],
        score: [95.1234, 88.0, null],
        extra: [null, "yes", null]
    };

    // 1. Standard stringifyCSV
    const csvStr = stringifyCSV(columns, 3);
    if (!csvStr.includes("id,name,note,score,extra")) throw new Error("Header line mismatch");
    if (!csvStr.includes('1,Alice,"Hello, world!",95.1234,')) throw new Error("Quoting of comma failed");
    if (!csvStr.includes('2,Bob,"He said ""hello!""",88,yes')) throw new Error("Quote escaping failed");
    if (!csvStr.includes('"Line 1\nLine 2"')) throw new Error("Embedded newline failed");

    // 2. includeHeader: false
    const noHeaderCSV = stringifyCSV(columns, 3, { includeHeader: false });
    if (noHeaderCSV.includes("id,name,note")) throw new Error("Headers found when includeHeader: false");

    // 3. quoteStyle: "always"
    const alwaysQuoted = stringifyCSV(columns, 3, { quoteStyle: "always" });
    if (!alwaysQuoted.startsWith('"id","name","note","score","extra"')) throw new Error("quoteStyle: always failed for headers");
    if (!alwaysQuoted.includes('"1","Alice","Hello, world!","95.1234",""')) throw new Error("quoteStyle: always failed for row");

    // 4. quoteStyle: "never"
    const neverQuoted = stringifyCSV(columns, 3, { quoteStyle: "never" });
    if (!neverQuoted.includes('2,Bob,He said "hello!",88,yes')) throw new Error("quoteStyle: never failed");

    // 5. quoteStyle: "non_numeric"
    const nonNumericQuoted = stringifyCSV(columns, 3, { quoteStyle: "non_numeric" });
    if (!nonNumericQuoted.includes('1,"Alice","Hello, world!",95.1234,')) throw new Error("quoteStyle: non_numeric failed");

    // 6. nullValue
    const customNulls = stringifyCSV(columns, 3, { nullValue: "N/A" });
    if (!customNulls.includes(",N/A") || !customNulls.includes(",N/A,N/A")) throw new Error("nullValue failed");

    // 7. includeBom
    const bomStr = stringifyCSV(columns, 3, { includeBom: true });
    if (!bomStr.startsWith("\ufeff")) throw new Error("includeBom failed");

    // 8. lineTerminator
    const crlfStr = stringifyCSV(columns, 3, { lineTerminator: "\r\n" });
    if (!crlfStr.includes("\r\n")) throw new Error("lineTerminator failed");

    // 9. onRow streaming callback
    const streamed: string[] = [];
    stringifyCSV(columns, 3, { onRow: (row) => streamed.push(row) });
    if (streamed.length !== 4) throw new Error("onRow streaming failed, count=" + streamed.length);

    // 10. 0 rows header-only
    const emptyCols = { a: [], b: [] };
    const emptyCsv = stringifyCSV(emptyCols, 0);
    if (emptyCsv !== "a,b") throw new Error("Empty rows header-only failed: " + emptyCsv);

    // 11. 0 rows without header returns empty string
    const emptyNoHeader = stringifyCSV(emptyCols, 0, { includeHeader: false });
    if (emptyNoHeader !== "") throw new Error("Empty rows no header failed");

    // 12. Single column with quotes, commas, and newlines in values
    const singleCol = { text: ['"leading quote', "comma,here", "new\nline", "normal"] };
    const singleRes = stringifyCSV(singleCol, 4);
    if (!singleRes.includes('"""leading quote"') || !singleRes.includes('"comma,here"') || !singleRes.includes('"new\nline"')) {
        throw new Error("Single column with specials failed");
    }

    // 13. Semicolon separator with quoteChar single quote
    const semiCols = { x: [10, 20], y: ["a;b", "c'd"] };
    const semiRes = stringifyCSV(semiCols, 2, { separator: ";", quoteChar: "'" });
    if (!semiRes.startsWith("x;y") || !semiRes.includes("10;'a;b'") || !semiRes.includes("20;'c''d'")) {
        throw new Error("Custom semicolon and single-quote delimiter failed: " + semiRes);
    }

    // 14. quoteStyle: "non_numeric" with booleans, dates, bigints, and nulls
    const mixedTypesCol = {
        bool: [true, false],
        bi: [100n, 200n],
        str: ["plain", "needs,quotes"]
    };
    const nonNumRes = stringifyCSV(mixedTypesCol, 2, { quoteStyle: "non_numeric" });
    if (!nonNumRes.includes('"true"') || !nonNumRes.includes('100') || !nonNumRes.includes('"plain"')) {
        throw new Error("quoteStyle non_numeric type discrimination failed: " + nonNumRes);
    }

    // 15. Streaming with BOM
    const streamedBom: string[] = [];
    stringifyCSV({ col: [1] }, 1, { includeBom: true, onRow: (row) => streamedBom.push(row) });
    if (!streamedBom[0].startsWith("\ufeff")) {
        throw new Error("Streaming onRow with BOM failed");
    }

    // 16. Nested JSON objects and arrays serialized inside CSV fields
    const nestedData = {
        meta: [{ id: 1, tags: ["a", "b"] }, [1, 2, 3]]
    };
    const nestedRes = stringifyCSV(nestedData, 2);
    if (!nestedRes.includes('"{""id"":1,""tags"":[""a"",""b""]}"') || !nestedRes.includes('"[1,2,3]"')) {
        throw new Error("Nested object and array JSON formatting in CSV failed: " + nestedRes);
    }

    // 17. Sets, Maps, RegExps, and nested BigInts in CSV cells
    const specialObjs = {
        s: [new Set([1, 2])],
        m: [new Map([["a", 1]])],
        r: [/foo/i],
        nestedBi: [{ val: 9876543210n }]
    };
    const specialRes = stringifyCSV(specialObjs, 1);
    if (!specialRes.includes('"[1,2]"') || !specialRes.includes('"[[""a"",1]]"') || !specialRes.includes("/foo/i") || !specialRes.includes('"{""val"":""9876543210""}"')) {
        throw new Error("Special objects (Set, Map, RegExp, nested BigInt) formatting failed: " + specialRes);
    }

    // 18. Custom onBigInt replacer override
    const customBiData = { val: [123n] };
    const customBiRes = stringifyCSV(customBiData, 1, { replacerOptions: { onBigInt: (bi: bigint) => `BIG_${bi}` } });
    if (!customBiRes.includes("BIG_123")) {
        throw new Error("Custom onBigInt replacer option in stringifyCSV failed: " + customBiRes);
    }

    // 19. Circular object handling
    const circularObj: any = { a: 1 };
    circularObj.self = circularObj;
    const circRes = stringifyCSV({ circ: [circularObj] }, 1, { replacerOptions: { handleCircular: true } });
    if (!circRes.includes('[Circular]')) {
        throw new Error("Circular object handling in stringifyCSV failed: " + circRes);
    }

    // 20. Invalid Date and non-finite numbers
    const edgePrimitives = {
        d: [new Date(NaN)],
        inf: [Infinity],
        nan: [NaN],
        u8: [new Uint8Array([10, 20])]
    };
    const edgeRes = stringifyCSV(edgePrimitives, 1, { nullValue: "NULL_VAL" });
    if (!edgeRes.includes("NULL_VAL") || !edgeRes.includes("Infinity") || !edgeRes.includes("NaN") || !edgeRes.includes('"[10,20]"')) {
        throw new Error("Invalid date, Infinity, NaN, and Uint8Array in stringifyCSV failed: " + edgeRes);
    }

    // 21. Boxed primitive objects (Number, String, Boolean)
    const boxedData = {
        bNum: [new Number(1.5)],
        bStr: [new String("wrapped")],
        bBool: [new Boolean(false)]
    };
    const boxedRes = stringifyCSV(boxedData, 1);
    if (!boxedRes.includes("1.5") || !boxedRes.includes("wrapped") || !boxedRes.includes("false")) {
        throw new Error("Boxed primitive objects formatting in stringifyCSV failed: " + boxedRes);
    }

    // 22. Custom accounting negatives and localized numbers
    const accountingData = { negBi: [-500n], floatVal: [123.456] };
    const accountingRes = stringifyCSV(accountingData, 1, {
        numericFormatOptions: { locale: "de-DE", accountingNegatives: true, useGrouping: true }
    });
    if (!accountingRes.includes("(500)") || !accountingRes.includes('"123,456"')) {
        throw new Error("Localized accounting formatting in stringifyCSV failed: " + accountingRes);
    }

    console.log("✓ stringifyCSV tests passed!");
} catch (err: any) {
    console.error(`❌ stringifyCSV test failed: ${err.message}`);
    process.exit(1);
}
