import { $df, DataFrame } from "../../src/index";
import { isJsonString, safeJsonParse, createSafeJsonReplacer } from "../../src/utils";
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
    const dfJson = $df.read_json(jsonContent);
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
    const dfNdjson = $df.read_json(ndjsonContent, { format: "ndjson" });
    if (dfNdjson.height !== 2) throw new Error("read_json ndjson length mismatch");
    if (dfNdjson.to_dicts()[1].name !== "Bob") throw new Error("read_json ndjson data mismatch");

    // Test NDJSON with legacy CR line endings (\r)
    const ndjsonCrContent = '{"id":1,"name":"Alice"}\r{"id":2,"name":"Bob"}';
    const dfNdjsonCr = $df.read_json(ndjsonCrContent, { format: "ndjson" });
    if (dfNdjsonCr.height !== 2) throw new Error("read_json ndjson CR length mismatch");
    if (dfNdjsonCr.to_dicts()[1].name !== "Bob") throw new Error("read_json ndjson CR data mismatch");

    // Test that read_json passes down skipInvalidLines and other options to safeJsonParse
    const readJsonMixedNdjson = '{"id":1,"name":"Alice"}\ninvalid-json\n{"id":2,"name":"Bob"}';
    const dfMixedNdjson = $df.read_json(readJsonMixedNdjson, {
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
        $df.read_json("not a json string");
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

    // Test that wrapped JSON with trailing/leading whitespaces is correctly validated/parsed by default
    if (!isJsonString('  {"a":1}  ', { allowPrimitives: false })) {
        throw new Error("isJsonString failed to validate wrapped JSON with trailing/leading whitespaces");
    }
    if (!isJsonString('  {"a":1}  ', { allowPrimitives: false, trimBeforeParse: true })) {
        throw new Error("isJsonString failed to validate wrapped JSON with trimBeforeParse: true");
    }

    const untrimmedParse = safeJsonParse('  {"a":1}  ');
    if (typeof untrimmedParse === "string" || (untrimmedParse as any).a !== 1) {
        throw new Error("safeJsonParse failed to parse untrimmed JSON string by default");
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

    const parsedNdjsonWithSpaces = safeJsonParse('  {"a":1}  \n\t{"b":2} \r', { format: "ndjson" });
    if (!Array.isArray(parsedNdjsonWithSpaces) || parsedNdjsonWithSpaces[0].a !== 1 || parsedNdjsonWithSpaces[1].b !== 2) {
        throw new Error("safeJsonParse failed to parse NDJSON with line-level whitespace");
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

    // 18. Test safeJsonParse direct successful parsing
    const parsedWithSkip = safeJsonParse('{"a":1}');
    if (typeof parsedWithSkip === "string" || (parsedWithSkip as any).a !== 1) {
        throw new Error("safeJsonParse failed to parse directly");
    }

    const failedSkip = safeJsonParse('invalid-json', { fallback: "fallback-val" });
    if (failedSkip !== "fallback-val") {
        throw new Error("safeJsonParse failed to return fallback on invalid input natively");
    }

    const primitiveSkip = safeJsonParse('123', { allowPrimitives: false, fallback: "fallback-val" });
    if (primitiveSkip !== "fallback-val") {
        throw new Error("safeJsonParse incorrectly allowed primitive when disallowed natively");
    }

    // 19. Test custom replacer in write_json
    const dfForReplacer = new DataFrame([{ a: 1, b: "hello" }]);
    const replacerStr = dfForReplacer.write_json(undefined, {
        replacerOptions: {
            replacer: (key: string, value: any) => {
                if (key === "a") return (value as number) * 10;
                return value;
            }
        }
    });
    const parsedReplacer = JSON.parse(replacerStr as string);
    if (parsedReplacer[0].a !== 10 || parsedReplacer[0].b !== "hello") {
        throw new Error("write_json custom replacer failed");
    }

    // Test array whitelist replacer in write_json
    const whitelistStr = dfForReplacer.write_json(undefined, {
        replacerOptions: {
            replacer: ["b"]
        }
    });
    const parsedWhitelist = JSON.parse(whitelistStr as string);
    if (parsedWhitelist[0].a !== undefined || parsedWhitelist[0].b !== "hello") {
        throw new Error("write_json custom array replacer failed");
    }

    // 20. Test safe serialization with custom replacer function
    const dfWithComplex = new DataFrame([{ id: 1, val: 42n, tags: new Set(["a", "b"]), date: new Date("2026-06-14T21:45:42.000Z") }]);
    const composedFuncStr = dfWithComplex.write_json(undefined, {
        replacerOptions: {
            replacer: (key: string, value: any) => {
                if (key === "id") return 999;
                return value;
            }
        }
    });
    const parsedComposedFunc = JSON.parse(composedFuncStr);
    if (parsedComposedFunc[0].id !== 999) {
        throw new Error("Composed custom replacer function failed to modify key");
    }
    if (parsedComposedFunc[0].val !== "42") {
        throw new Error("Composed custom replacer function failed to safely serialize bigint");
    }
    if (!Array.isArray(parsedComposedFunc[0].tags) || parsedComposedFunc[0].tags[0] !== "a") {
        throw new Error("Composed custom replacer function failed to safely serialize Set");
    }
    if (parsedComposedFunc[0].date !== "2026-06-14T21:45:42.000Z") {
        throw new Error("Composed custom replacer function failed to safely serialize Date");
    }

    // 21. Test safe serialization with custom whitelist array
    const composedWhitelistStr = dfWithComplex.write_json(undefined, {
        replacerOptions: {
            replacer: ["val", "date"]
        }
    });
    const parsedComposedWhitelist = JSON.parse(composedWhitelistStr);
    if (parsedComposedWhitelist[0].id !== undefined || parsedComposedWhitelist[0].tags !== undefined) {
        throw new Error("Composed whitelist array failed to filter keys");
    }
    if (parsedComposedWhitelist[0].val !== "42") {
        throw new Error("Composed whitelist array failed to safely serialize bigint");
    }
    if (parsedComposedWhitelist[0].date !== "2026-06-14T21:45:42.000Z") {
        throw new Error("Composed whitelist array failed to safely serialize Date");
    }

    // 22. Test createSafeJsonReplacer overrides (onBigInt, onDate, onSet, etc.)
    const customSafeReplacer = createSafeJsonReplacer({
        onBigInt: (v) => Number(v) * 2,
        onDate: (d) => "date:" + d.getUTCFullYear(),
        onSet: (s) => Array.from(s).join(",")
    });
    const overrideJSON = JSON.stringify({
        big: 10n,
        dt: new Date("2026-06-14T21:45:42.000Z"),
        st: new Set(["x", "y"])
    }, customSafeReplacer);
    const parsedOverride = JSON.parse(overrideJSON);
    if (parsedOverride.big !== 20) {
        throw new Error("createSafeJsonReplacer onBigInt override failed");
    }
    if (parsedOverride.dt !== "date:2026") {
        throw new Error("createSafeJsonReplacer onDate override failed");
    }
    if (parsedOverride.st !== "x,y") {
        throw new Error("createSafeJsonReplacer onSet override failed");
    }

    // 23. Test replacer: null voids safe replacer (and thus throws on BigInt)
    let nullReplacerThrew = false;
    try {
        dfWithComplex.write_json(undefined, { replacerOptions: { replacer: null } });
    } catch (err: any) {
        nullReplacerThrew = true;
    }
    if (!nullReplacerThrew) {
        throw new Error("write_json with replacer: null should have thrown TypeError on BigInt");
    }

    // 24. Test createSafeJsonReplacer onCustom override for arbitrary objects
    class CustomWrapper {
        constructor(public data: string) {}
    }
    const customReplacerWithFallback = createSafeJsonReplacer({
        onCustom: function (this: any, k: string, v: any) {
            if (v instanceof CustomWrapper) {
                return "wrapped:" + v.data;
            }
            if (k === "omitMe") {
                return undefined;
            }
            return v;
        }
    });
    const customJSON = JSON.stringify({
        custom: new CustomWrapper("hello"),
        normal: 123,
        omitMe: "some-value"
    }, customReplacerWithFallback);
    const parsedCustom = JSON.parse(customJSON);
    if (parsedCustom.custom !== "wrapped:hello") {
        throw new Error("createSafeJsonReplacer onCustom override failed for CustomWrapper");
    }
    if (parsedCustom.normal !== 123) {
        throw new Error("createSafeJsonReplacer onCustom override did not preserve normal value when returned");
    }
    if (parsedCustom.omitMe !== undefined) {
        throw new Error("createSafeJsonReplacer onCustom override failed to omit property when returning undefined");
    }

    // 25. Test createSafeJsonReplacer voidBigIntReplacement
    const voidBigIntReplacer = createSafeJsonReplacer({
        voidBigIntReplacement: true
    });
    let voidBigIntThrew = false;
    try {
        JSON.stringify({ val: 42n }, voidBigIntReplacer);
    } catch (err) {
        voidBigIntThrew = true;
    }
    if (!voidBigIntThrew) {
        throw new Error("voidBigIntReplacement: true should have thrown TypeError on BigInt serialization");
    }

    // 26. Test createSafeJsonReplacer voidDateReplacement
    const voidDateReplacer = createSafeJsonReplacer({
        voidDateReplacement: true,
        formatDate: (d) => "custom-date-format-" + d.getUTCFullYear()
    });
    const voidDateJSON = JSON.stringify({
        date: new Date("2026-06-14T21:45:42.000Z")
    }, voidDateReplacer);
    const parsedVoidDate = JSON.parse(voidDateJSON);
    if (parsedVoidDate.date !== "2026-06-14T21:45:42.000Z") {
        throw new Error("voidDateReplacement: true failed to preserve native toJSON representation");
    }

    // 27. Test circular reference handling
    const circularObj: any = { name: "parent" };
    circularObj.self = circularObj;
    const circularJSON = JSON.stringify(circularObj, createSafeJsonReplacer({ handleCircular: true }));
    const parsedCircular = JSON.parse(circularJSON);
    if (parsedCircular.self !== "[Circular]") {
        throw new Error("Circular reference handling failed to replace with '[Circular]'");
    }

    // 28. Test circular reference override callback
    const customCircularJSON = JSON.stringify(circularObj, createSafeJsonReplacer({
        handleCircular: true,
        onCircular: () => "custom-circular-ref"
    }));
    const parsedCustomCircular = JSON.parse(customCircularJSON);
    if (parsedCustomCircular.self !== "custom-circular-ref") {
        throw new Error("Circular reference custom override failed");
    }

    // 29. Test Error serialization
    const errJSON = JSON.stringify({ err: new Error("something went wrong") }, createSafeJsonReplacer());
    const parsedErr = JSON.parse(errJSON);
    if (parsedErr.err.name !== "Error" || parsedErr.err.message !== "something went wrong" || typeof parsedErr.err.stack !== "string") {
        throw new Error("Error serialization failed");
    }

    // 30. Test Error serialization override
    const customErrJSON = JSON.stringify({ err: new Error("custom error") }, createSafeJsonReplacer({
        onError: (err) => "custom-error-str:" + err.message
    }));
    const parsedCustomErr = JSON.parse(customErrJSON);
    if (parsedCustomErr.err !== "custom-error-str:custom error") {
        throw new Error("Error serialization override failed");
    }

    // 31. Test URLSearchParams serialization
    const params = new URLSearchParams({ a: "1", b: "2" });
    const paramsJSON = JSON.stringify({ params }, createSafeJsonReplacer());
    const parsedParams = JSON.parse(paramsJSON);
    if (parsedParams.params !== "a=1&b=2") {
        throw new Error("URLSearchParams serialization failed");
    }

    // 32. Test URLSearchParams serialization override
    const customParamsJSON = JSON.stringify({ params }, createSafeJsonReplacer({
        onURLSearchParams: () => "custom-params-str"
    }));
    const parsedCustomParams = JSON.parse(customParamsJSON);
    if (parsedCustomParams.params !== "custom-params-str") {
        throw new Error("URLSearchParams serialization override failed");
    }

    // 33. Test write_json options forwarding (circular references)
    const dfCircular = new DataFrame([{ id: 1, self: circularObj }]);
    const dfCircularJSON = dfCircular.write_json(undefined, { replacerOptions: { handleCircular: true } });
    const parsedDfCircular = JSON.parse(dfCircularJSON);
    if (parsedDfCircular[0].self.self !== "[Circular]") {
        throw new Error("df.write_json failed to forward handleCircular option");
    }

    // 34. Test write_json options forwarding (Error override)
    const dfError = new DataFrame([{ id: 1, err: new Error("dataframe error") }]);
    const dfErrorJSON = dfError.write_json(undefined, {
        replacerOptions: {
            onError: (err) => "df-error-str:" + err.message
        }
    });
    const parsedDfError = JSON.parse(dfErrorJSON);
    if (parsedDfError[0].err !== "df-error-str:dataframe error") {
        throw new Error("df.write_json failed to forward onError option");
    }

    console.log("\n🎉 ALL DATAFRAME JSON I/O TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ DataFrame JSON I/O TESTS FAILED:", err);
    process.exit(1);
}
