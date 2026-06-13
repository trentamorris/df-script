import { $df, DataFrame } from "../../src/index";
import { isJsonString, safeJsonParse } from "../../src/utils";
import * as fs from "fs";
import * as path from "path";

console.log("=========================================");
console.log("STARTING DATAFRAME JSON I/O TESTS...");
console.log("=========================================");

try {
    // 1. Test JSON Array reading and writing
    const jsonContent = JSON.stringify([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" }
    ]);
    const dfJson = DataFrame.read_json(jsonContent);
    if (dfJson.height !== 2) throw new Error("read_json length mismatch");
    if (dfJson.to_dicts()[0].name !== "Alice") throw new Error("read_json data mismatch");

    const exportedJSON = dfJson.write_json();
    if (typeof exportedJSON !== "string" || JSON.parse(exportedJSON).length !== 2) {
        throw new Error("write_json output mismatch");
    }

    // 2. Test NDJSON reading and writing
    const ndjsonContent = 
`{"id":1,"name":"Alice"}
{"id":2,"name":"Bob"}`;
    const dfNdjson = DataFrame.read_json(ndjsonContent, { format: "ndjson" });
    if (dfNdjson.height !== 2) throw new Error("read_json ndjson length mismatch");
    if (dfNdjson.to_dicts()[1].name !== "Bob") throw new Error("read_json ndjson data mismatch");

    // Test NDJSON with legacy CR line endings (\r)
    const ndjsonCrContent = '{"id":1,"name":"Alice"}\r{"id":2,"name":"Bob"}';
    const dfNdjsonCr = DataFrame.read_json(ndjsonCrContent, { format: "ndjson" });
    if (dfNdjsonCr.height !== 2) throw new Error("read_json ndjson CR length mismatch");
    if (dfNdjsonCr.to_dicts()[1].name !== "Bob") throw new Error("read_json ndjson CR data mismatch");

    // Test that read_json passes down skipInvalidLines and other options to safeJsonParse
    const readJsonMixedNdjson = '{"id":1,"name":"Alice"}\ninvalid-json\n{"id":2,"name":"Bob"}';
    const dfMixedNdjson = DataFrame.read_json(readJsonMixedNdjson, {
        format: "ndjson",
        ndjson: { skipInvalidLines: true }
    });
    if (dfMixedNdjson.height !== 2) throw new Error("read_json failed to pass skipInvalidLines to safeJsonParse");
    if (dfMixedNdjson.to_dicts()[1].name !== "Bob") throw new Error("read_json ndjson skipInvalidLines data mismatch");

    const exportedNDJSON = dfNdjson.write_json(undefined, { format: "ndjson" });
    if (typeof exportedNDJSON !== "string") throw new Error("write_json ndjson output was not string");
    const ndjsonLines = exportedNDJSON.split("\n");
    if (ndjsonLines.length !== 2) throw new Error("write_json ndjson lines mismatch");
    if (JSON.parse(ndjsonLines[0]).name !== "Alice") throw new Error("write_json ndjson data mismatch");

    // 3. Test writing JSON to a file path
    const tempFilePath = path.join(__dirname, "temp_test_output.json");
    if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
    }
    
    dfJson.write_json(tempFilePath);
    if (!fs.existsSync(tempFilePath)) throw new Error("write_json to file path failed: file does not exist");
    const fileContent = fs.readFileSync(tempFilePath, "utf8");
    if (JSON.parse(fileContent).length !== 2) throw new Error("write_json to file path: parsed data length mismatch");
    
    fs.unlinkSync(tempFilePath);

    // 4. Test writing JSON to a writable-like object (with .write method)
    let writtenStr = "";
    const mockWritable = {
        write(str: string) {
            writtenStr += str;
        }
    };
    dfJson.write_json(mockWritable);
    if (JSON.parse(writtenStr).length !== 2) throw new Error("write_json to writable-like object failed");

    // 5. Test JSON parsing error handling
    let parseErrorThrown = false;
    try {
        DataFrame.read_json("not a json string");
    } catch (err: any) {
        parseErrorThrown = true;
        if (!err.message.includes("Invalid JSON")) {
            throw new Error("Wrong error message for invalid JSON string");
        }
    }
    if (!parseErrorThrown) throw new Error("read_json failed to throw error on invalid JSON input");

    // 6. Test isJsonString and safeJsonParse options directly
    if (!isJsonString('{"a":1}')) throw new Error("isJsonString failed for standard JSON");
    if (isJsonString('{\n"a":1\n}', { format: "ndjson" })) throw new Error("isJsonString passed formatted standard JSON as NDJSON");
    if (!isJsonString('{"a":1}\n{"b":2}', { format: "ndjson" })) throw new Error("isJsonString failed for NDJSON");
    if (isJsonString('123', { allowPrimitives: false })) throw new Error("isJsonString allowed primitives when disallowed");
    if (!isJsonString('123', { allowPrimitives: true })) throw new Error("isJsonString rejected primitives when allowed");
    if (isJsonString('123\n456', { format: "ndjson", allowPrimitives: false })) {
        throw new Error("isJsonString allowed NDJSON primitives when disallowed");
    }
    if (!isJsonString('123\n456', { format: "ndjson", allowPrimitives: true })) {
        throw new Error("isJsonString rejected NDJSON primitives when allowed");
    }

    // Test trimBeforeParse option
    if (isJsonString('  {"a":1}  ', { allowPrimitives: false })) {
        throw new Error("isJsonString incorrectly allowed untrimmed JSON wrapping by default");
    }
    if (!isJsonString('  {"a":1}  ', { allowPrimitives: false, trimBeforeParse: true })) {
        throw new Error("isJsonString failed to validate wrapped JSON with trimBeforeParse: true");
    }

    const untrimmedParse = safeJsonParse('  {"a":1}  ');
    if (typeof untrimmedParse !== "string") {
        throw new Error("safeJsonParse incorrectly parsed untrimmed JSON string by default");
    }
    const trimmedParse = safeJsonParse('  {"a":1}  ', { trimBeforeParse: true });
    if (typeof trimmedParse === "string" || (trimmedParse as any).a !== 1) {
        throw new Error("safeJsonParse failed to parse untrimmed JSON with trimBeforeParse: true");
    }

    // Test safeJsonParse allowPrimitives option
    const rawPrimitive = "123";
    const parsedDefaultPrimitive = safeJsonParse(rawPrimitive);
    if (parsedDefaultPrimitive !== rawPrimitive) {
        throw new Error("safeJsonParse incorrectly parsed primitive when allowPrimitives is false");
    }
    const parsedAllowedPrimitive = safeJsonParse(rawPrimitive, { allowPrimitives: true });
    if (parsedAllowedPrimitive !== 123) {
        throw new Error("safeJsonParse failed to parse primitive when allowPrimitives is true");
    }

    const parsedDirectJson = safeJsonParse('{"a":1}');
    if ((parsedDirectJson as any).a !== 1) throw new Error("safeJsonParse failed to parse standard JSON");

    const parsedDirectNdjson = safeJsonParse('{"a":1}\n{"b":2}', { format: "ndjson" });
    if (!Array.isArray(parsedDirectNdjson) || parsedDirectNdjson[1].b !== 2) {
        throw new Error("safeJsonParse failed to parse NDJSON");
    }

    // 7. Test reviver option
    const reviverResult = safeJsonParse('{"score":42}', {
        reviver: (key, value) => key === "score" ? (value as number) * 2 : value
    });
    if ((reviverResult as any).score !== 84) throw new Error("safeJsonParse reviver failed");

    // 8. Test ndjson.skipInvalidLines option
    const mixedNdjson = '{"a":1}\nnot-valid-json\n{"b":2}';
    const failResult = safeJsonParse(mixedNdjson, { format: "ndjson" });
    if (failResult !== mixedNdjson) throw new Error("safeJsonParse should return input on invalid NDJSON");

    const skipResult = safeJsonParse(mixedNdjson, { format: "ndjson", ndjson: { skipInvalidLines: true } });
    if (!Array.isArray(skipResult) || skipResult.length !== 2 || skipResult[1].b !== 2) {
        throw new Error("safeJsonParse ndjson.skipInvalidLines failed to skip invalid line");
    }

    // 9. Test guard — passes when shape matches
    const guardPass = safeJsonParse('{"name":"Alice","age":30}', {
        guard: (v) => typeof v === "object" && v !== null && "name" in v && "age" in v
    });
    if ((guardPass as any).name !== "Alice") throw new Error("safeJsonParse guard incorrectly blocked valid result");

    // 10. Test guard — returns original input when shape does not match
    const guardFail = safeJsonParse('{"name":"Alice"}', {
        guard: (v) => typeof v === "object" && v !== null && "age" in v
    });
    if (guardFail !== '{"name":"Alice"}') throw new Error("safeJsonParse guard should return original input on failure");

    // 11. Test onError — called when guard fails
    let onErrorCalled = false;
    safeJsonParse('{"value":1}', {
        guard: (v) => typeof v === "object" && v !== null && "missing" in v,
        onError: () => { onErrorCalled = true; }
    });
    if (!onErrorCalled) throw new Error("safeJsonParse onError was not called on guard failure");

    // 12. Test ndjson.maxLines — only parses first N non-empty lines
    const fiveLines = '{"a":1}\n{"b":2}\n{"c":3}\n{"d":4}\n{"e":5}';
    const limitedResult = safeJsonParse(fiveLines, { format: "ndjson", ndjson: { maxLines: 3 } });
    if (!Array.isArray(limitedResult) || limitedResult.length !== 3 || (limitedResult[2] as any).c !== 3) {
        throw new Error("safeJsonParse ndjson.maxLines failed to limit parsed lines");
    }

    // 13. Test ndjson.skipLines option
    const skippedResult = safeJsonParse(fiveLines, { format: "ndjson", ndjson: { skipLines: 2 } });
    if (!Array.isArray(skippedResult) || skippedResult.length !== 3 || (skippedResult[0] as any).c !== 3) {
        throw new Error("safeJsonParse ndjson.skipLines failed to skip lines");
    }

    // 14. Test combined skipLines and maxLines
    const combinedResult = safeJsonParse(fiveLines, { format: "ndjson", ndjson: { skipLines: 1, maxLines: 2 } });
    if (!Array.isArray(combinedResult) || combinedResult.length !== 2 || (combinedResult[0] as any).b !== 2 || (combinedResult[1] as any).c !== 3) {
        throw new Error("safeJsonParse combined skipLines and maxLines failed");
    }

    // 15. Test fallback
    const badJson = '{"invalid": ';
    const fallbackRes = safeJsonParse(badJson, { fallback: { defaultValue: true } });
    if (typeof fallbackRes !== "object" || fallbackRes === null || !("defaultValue" in fallbackRes)) {
        throw new Error("safeJsonParse fallback failed");
    }

    // 16. Test fallback with guard failure
    const guardFallbackRes = safeJsonParse('{"a": 1}', {
        guard: (v): v is { b: number } => typeof v === "object" && v !== null && "b" in v,
        fallback: { b: 99 }
    });
    if (typeof guardFallbackRes === "string" || guardFallbackRes.b !== 99) {
        throw new Error("safeJsonParse guard fallback failed");
    }

    // 17. Test type safety / generic parameters compile correctness
    interface ExpectedType {
        a: number;
    }
    const guardCheck = (v: unknown): v is ExpectedType => typeof v === "object" && v !== null && "a" in v;
    const typedRes = safeJsonParse<ExpectedType, string, { a: number }>(
        '{"a": 123}', 
        { guard: guardCheck, fallback: { a: 456 } }
    );
    if (typeof typedRes !== "string" && typedRes.a !== 123) {
        throw new Error("safeJsonParse generic type test failed");
    }

    // 18. Test skipValidation option
    const parsedWithSkip = safeJsonParse('{"a":1}', { skipValidation: true });
    if (typeof parsedWithSkip === "string" || (parsedWithSkip as any).a !== 1) {
        throw new Error("safeJsonParse failed to parse with skipValidation: true");
    }

    const failedSkip = safeJsonParse('invalid-json', { skipValidation: true, fallback: "fallback-val" });
    if (failedSkip !== "fallback-val") {
        throw new Error("safeJsonParse with skipValidation: true failed to return fallback on invalid input");
    }

    const primitiveSkip = safeJsonParse('123', { skipValidation: true, allowPrimitives: false, fallback: "fallback-val" });
    if (primitiveSkip !== "fallback-val") {
        throw new Error("safeJsonParse with skipValidation: true incorrectly allowed primitive when disallowed");
    }

    // 19. Test custom replacer in write_json
    const dfForReplacer = new DataFrame([{ a: 1, b: "hello" }]);
    const replacerStr = dfForReplacer.write_json(undefined, {
        replacer: (key: string, value: any) => {
            if (key === "a") return (value as number) * 10;
            return value;
        }
    });
    const parsedReplacer = JSON.parse(replacerStr as string);
    if (parsedReplacer[0].a !== 10 || parsedReplacer[0].b !== "hello") {
        throw new Error("write_json custom replacer failed");
    }

    // Test array whitelist replacer in write_json
    const whitelistStr = dfForReplacer.write_json(undefined, {
        replacer: ["b"]
    });
    const parsedWhitelist = JSON.parse(whitelistStr as string);
    if (parsedWhitelist[0].a !== undefined || parsedWhitelist[0].b !== "hello") {
        throw new Error("write_json custom array replacer failed");
    }

    console.log("\n🎉 ALL DATAFRAME JSON I/O TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ DataFrame JSON I/O TESTS FAILED:", err);
    process.exit(1);
}
