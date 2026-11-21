declare const process: any;
import { $df } from "df-script";
import { Int64, Utf8 } from "df-script";

console.log("=========================================");
console.log("STARTING $df.readJson FUNCTION TESTS...");
console.log("=========================================");

try {
    // 1. Test JSON Array reading
    const jsonContent = JSON.stringify([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" }
    ]);
    const dfJson = $df.readJson(jsonContent);
    if (dfJson.height !== 2) throw new Error("readJson length mismatch");
    if (dfJson.toDicts()[0].name !== "Alice") throw new Error("readJson data mismatch");

    // 2. Test single JSON object reading
    const singleObjContent = JSON.stringify({ id: 10, name: "Charlie" });
    const dfSingle = $df.readJson(singleObjContent);
    if (dfSingle.height !== 1 || dfSingle.toDicts()[0].name !== "Charlie") {
        throw new Error("readJson single object mismatch");
    }

    // 3. Test NDJSON reading
    const ndjsonContent = 
`{"id":1,"name":"Alice"}
{"id":2,"name":"Bob"}`;
    const dfNdjson = $df.readJson(ndjsonContent, { format: "ndjson" });
    if (dfNdjson.height !== 2) throw new Error("readJson ndjson length mismatch");
    if (dfNdjson.toDicts()[1].name !== "Bob") throw new Error("readJson ndjson data mismatch");

    // 4. Test NDJSON with legacy CR line endings (\r)
    const ndjsonCrContent = '{"id":1,"name":"Alice"}\r{"id":2,"name":"Bob"}';
    const dfNdjsonCr = $df.readJson(ndjsonCrContent, { format: "ndjson" });
    if (dfNdjsonCr.height !== 2) throw new Error("readJson ndjson CR length mismatch");
    if (dfNdjsonCr.toDicts()[1].name !== "Bob") throw new Error("readJson ndjson CR data mismatch");

    // 5. Test passing down skipInvalidLines option
    const readJsonMixedNdjson = '{"id":1,"name":"Alice"}\ninvalid-json\n{"id":2,"name":"Bob"}';
    const dfMixedNdjson = $df.readJson(readJsonMixedNdjson, {
        format: "ndjson",
        ndjson: { skipInvalidLines: true }
    });
    if (dfMixedNdjson.height !== 2) throw new Error("readJson failed to pass skipInvalidLines to safeJsonParse");
    if (dfMixedNdjson.toDicts()[1].name !== "Bob") throw new Error("readJson ndjson skipInvalidLines data mismatch");

    // 6. Test with explicit schema coercion
    const schemaCoerced = $df.readJson(jsonContent, {
        schema: {
            id: Int64,
            name: Utf8
        }
    });
    if (schemaCoerced.schema.id !== Int64 || schemaCoerced.schema.name !== Utf8) {
        throw new Error("readJson schema coercion failed");
    }

    // 7. Test invalid JSON error handling
    let parseErrorThrown = false;
    try {
        $df.readJson("not a json string");
    } catch (err: any) {
        parseErrorThrown = true;
        if (!err.message.includes("Invalid JSON input")) {
            throw new Error("Wrong error message for invalid JSON string");
        }
    }
    if (!parseErrorThrown) throw new Error("readJson failed to throw error on invalid JSON input");

    console.log("✓ $df.readJson tests passed successfully!");
} catch (e: any) {
    console.error(`❌ $df.readJson test failed: ${e.message}`);
    process.exit(1);
}
