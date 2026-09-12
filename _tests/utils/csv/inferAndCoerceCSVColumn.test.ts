declare const process: any;
import { inferAndCoerceCSVColumn } from "../../../src/utils/csv";

try {
    // 1. All-null column
    const allNulls = inferAndCoerceCSVColumn(["", "NA", "null", "NaN"]);
    if (allNulls.type.name !== "Utf8" || allNulls.values.some(v => v !== null) || allNulls.values.length !== 4) {
        throw new Error("All-null column inference failed");
    }

    // 2. Custom nullValues set
    const customNulls = inferAndCoerceCSVColumn(["10", "N/A", "20", "NONE"], { nullValues: ["N/A", "NONE"] });
    if (customNulls.type.name !== "Int64" || customNulls.values[0] !== 10n || customNulls.values[1] !== null || customNulls.values[3] !== null) {
        throw new Error("Custom nullValues set failed");
    }

    // 3. Bitmask elimination: "1", "2", "3.5" -> Float64
    const floatInfer = inferAndCoerceCSVColumn(["1", "2", "3.5"]);
    if (floatInfer.type.name !== "Float64" || floatInfer.values[0] !== 1 || floatInfer.values[2] !== 3.5) {
        throw new Error("Float64 type inference progression failed");
    }

    // 4. Pure integers
    const intInfer = inferAndCoerceCSVColumn(["100", "-200", "300"]);
    if (intInfer.type.name !== "Int64" || intInfer.values[0] !== 100n || intInfer.values[1] !== -200n) {
        throw new Error("Int64 inference failed");
    }

    // 5. Datetime inference
    const dateInfer = inferAndCoerceCSVColumn(["2026-01-01", "2026-06-15T12:00:00Z", "null"]);
    if (dateInfer.type.name !== "Datetime" || !(dateInfer.values[0] instanceof Date) || dateInfer.values[2] !== null) {
        throw new Error("Datetime inference failed");
    }

    // 6. Boolean inference
    const boolInfer = inferAndCoerceCSVColumn(["true", "0", "1", "false"]);
    if (boolInfer.type.name !== "Boolean" || boolInfer.values[0] !== true || boolInfer.values[1] !== false || boolInfer.values[2] !== true) {
        throw new Error("Boolean inference failed");
    }

    // 7. Mixed fallback to Utf8
    const mixedFallback = inferAndCoerceCSVColumn(["100", "hello", "200"]);
    if (mixedFallback.type.name !== "Utf8" || mixedFallback.values[1] !== "hello" || mixedFallback.values[0] !== "100") {
        throw new Error("Mixed fallback to Utf8 failed");
    }

    // 8. Whitespace trimming around numbers
    const padded = inferAndCoerceCSVColumn(["  42  ", "  84  ", ""]);
    if (padded.type.name !== "Int64" || padded.values[0] !== 42n || padded.values[2] !== null) {
        throw new Error("Whitespace padded integer inference failed");
    }

    // 9. Scientific notation / exponents
    const expInfer = inferAndCoerceCSVColumn(["1e3", "2.5e-2", "1.23E+4"]);
    if (expInfer.type.name !== "Float64" || expInfer.values[0] !== 1000 || expInfer.values[1] !== 0.025) {
        throw new Error("Scientific notation Float64 inference failed");
    }

    // 10. Empty array input
    const emptyColumn = inferAndCoerceCSVColumn([]);
    if (emptyColumn.type.name !== "Utf8" || emptyColumn.values.length !== 0) {
        throw new Error("Empty array inference failed");
    }

    // 11. Large integers that exceed Number.MAX_SAFE_INTEGER (must stay Int64 bigint)
    const bigIntInfer = inferAndCoerceCSVColumn(["9007199254740993", "9007199254740994"]);
    if (bigIntInfer.type.name !== "Int64" || bigIntInfer.values[0] !== 9007199254740993n) {
        throw new Error("Int64 exceeding MAX_SAFE_INTEGER inference failed");
    }

    // 12. Negative zero integer and float (-0, -0.0 parsed cleanly as Int64 0n)
    const negZeroInfer = inferAndCoerceCSVColumn(["-0", "-0.0"]);
    if (negZeroInfer.type.name !== "Int64" || negZeroInfer.values[0] !== 0n || negZeroInfer.values[1] !== 0n) {
        throw new Error("Negative zero inference failed: " + JSON.stringify(negZeroInfer));
    }

    // 13. Boolean edge cases with casing ("TRUE", "False", "0", "1")
    const casingBool = inferAndCoerceCSVColumn(["TRUE", "False", "1", "0"]);
    if (casingBool.type.name !== "Boolean" || casingBool.values[0] !== true || casingBool.values[1] !== false) {
        throw new Error("Boolean casing inference failed");
    }

    // 14. Non-boolean strings that start with true/false should fallback to Utf8
    const pseudoBool = inferAndCoerceCSVColumn(["true", "truthy", "false"]);
    if (pseudoBool.type.name !== "Utf8" || pseudoBool.values[1] !== "truthy") {
        throw new Error("Pseudo-boolean fallback failed");
    }

    // 15. Datetime with ISO fractional seconds, timezone offsets, and Z
    const isoDates = inferAndCoerceCSVColumn(["2026-09-12T11:45:00.123Z", "2026-01-01T00:00:00+02:00"]);
    if (isoDates.type.name !== "Datetime" || !(isoDates.values[0] instanceof Date)) {
        throw new Error("ISO Datetime with timezone inference failed");
    }

    // 16. Date-like invalid syntax falling back to Utf8
    const invalidDateStr = inferAndCoerceCSVColumn(["2026-01-01", "not-a-date", "2026-02-02"]);
    if (invalidDateStr.type.name !== "Utf8" || invalidDateStr.values[1] !== "not-a-date") {
        throw new Error("Invalid date fallback to Utf8 failed");
    }

    // 17. Extreme floats (Infinity, -Infinity, NaN if allowed or fallback)
    const infInfer = inferAndCoerceCSVColumn(["1.23", "Infinity", "-Infinity"]);
    if (infInfer.type.name !== "Float64" || infInfer.values[1] !== Infinity || infInfer.values[2] !== -Infinity) {
        throw new Error("Infinity Float64 inference failed");
    }

    // 18. Values with leading plus signs ("+123", "+45.6")
    const plusSigned = inferAndCoerceCSVColumn(["+123", "+45.6"]);
    if (plusSigned.type.name !== "Float64" || plusSigned.values[0] !== 123 || plusSigned.values[1] !== 45.6) {
        throw new Error("Plus signed numeric inference failed");
    }

    // 19. All values are null except one valid value
    const singleDataPoint = inferAndCoerceCSVColumn(["NA", "null", "42", ""]);
    if (singleDataPoint.type.name !== "Int64" || singleDataPoint.values[2] !== 42n || singleDataPoint.values[0] !== null) {
        throw new Error("Single valid data point among nulls failed");
    }

    // 20. Trimming around boolean values
    const paddedBool = inferAndCoerceCSVColumn(["  true  ", "  false  "]);
    if (paddedBool.type.name !== "Boolean" || paddedBool.values[0] !== true || paddedBool.values[1] !== false) {
        throw new Error("Whitespace padded boolean inference failed");
    }

    console.log("✓ inferAndCoerceCSVColumn tests passed!");
} catch (err: any) {
    console.error(`❌ inferAndCoerceCSVColumn test failed: ${err.message}`);
    process.exit(1);
}
