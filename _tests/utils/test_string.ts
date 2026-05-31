declare const process: any;
import { stripChars } from "../../src/utils/string";

console.log("=========================================");
console.log("STARTING UTILS STRING TESTS...");
console.log("=========================================");

try {
    // 2. stripChars with null/undefined inputs
    if (stripChars(null) !== null) throw new Error("Expected stripChars(null) to be null");
    if (stripChars(undefined) !== null) throw new Error("Expected stripChars(undefined) to be null");
    if (stripChars(null, null, { returnStringOnNull: true }) !== "") throw new Error("Expected stripChars(null, null, { returnStringOnNull: true }) to be ''");

    // 3. stripChars with characters == null (whitespace fallback)
    // 3a. returnStringOnNull: false (default)
    if (stripChars("   ") !== null) throw new Error("Expected stripChars('   ') to be null");
    if (stripChars("   ", null, { returnStringOnNull: false }) !== null) throw new Error("Expected stripChars('   ', null, { returnStringOnNull: false }) to be null");
    if (stripChars("  abc  ") !== "abc") throw new Error("Expected stripChars('  abc  ') to be 'abc'");
    // 3b. returnStringOnNull: true
    if (stripChars("   ", null, { returnStringOnNull: true }) !== "") throw new Error("Expected stripChars('   ', null, { returnStringOnNull: true }) to be ''");
    if (stripChars("", null, { returnStringOnNull: true }) !== "") throw new Error("Expected stripChars('', null, { returnStringOnNull: true }) to be ''");

    // 4. stripChars with characters != null
    // 4a. returnStringOnNull: false (default)
    if (stripChars("abc", "abc") !== null) throw new Error("Expected stripChars('abc', 'abc') to be null");
    if (stripChars("abc", "abc", { returnStringOnNull: false }) !== null) throw new Error("Expected stripChars('abc', 'abc', { returnStringOnNull: false }) to be null");
    if (stripChars("aabbccddeeff", "abcdef") !== null) throw new Error("Expected stripChars('aabbccddeeff', 'abcdef') to be null");
    if (stripChars("  abc  ", "abc", { trimFirst: true }) !== null) throw new Error("Expected stripChars('  abc  ', 'abc', { trimFirst: true }) to be null");
    if (stripChars("  abXba  ", "abc", { trimFirst: true }) !== "X") throw new Error("Expected stripChars('  abXba  ', 'abc', { trimFirst: true }) to be 'X'");
    // 4b. returnStringOnNull: true
    if (stripChars("abc", "abc", { returnStringOnNull: true }) !== "") throw new Error("Expected stripChars('abc', 'abc', { returnStringOnNull: true }) to be ''");
    if (stripChars("  abc  ", "abc", { trimFirst: true, returnStringOnNull: true }) !== "") throw new Error("Expected stripChars('  abc  ', 'abc', { trimFirst: true, returnStringOnNull: true }) to be ''");

    // 5. Contiguous stripping (standard behavior)
    if (stripChars("hhello", "h") !== "ello") throw new Error("Expected stripChars('hhello', 'h') to be 'ello'");
    if (stripChars("hhelloh", "h") !== "ello") throw new Error("Expected stripChars('hhelloh', 'h') to be 'ello'");

    // 6. Scanning offset window contiguous stripping tests
    if (stripChars("aloud", "lou", { maxScanStart: 2, maxScanEnd: 2 }) !== "ad") throw new Error("Expected stripChars('aloud', 'lou', { maxScanStart: 2, maxScanEnd: 2 }) to be 'ad'");
    if (stripChars("aaloud", "lou", { maxScanStart: 2, maxScanEnd: 2 }) !== "aad") throw new Error("Expected stripChars('aaloud', 'lou', { maxScanStart: 2, maxScanEnd: 2 }) to be 'aad'");
    if (stripChars("aaloud", "lou", { maxScanStart: 2, maxScanEnd: 1 }) !== "aaloud") throw new Error("Expected stripChars('aaloud', 'lou', { maxScanStart: 2, maxScanEnd: 1 }) to be 'aaloud'");
    if (stripChars("aaloud", "lou", { maxScanStart: 3, maxScanEnd: 1 }) !== "aad") throw new Error("Expected stripChars('aaloud', 'lou', { maxScanStart: 3, maxScanEnd: 1 }) to be 'aad'");

    // 7. stripChars with RegExp characters
    if (stripChars("123hello456", /[0-9]/) !== "hello") throw new Error("Expected stripChars('123hello456', /[0-9]/) to be 'hello'");
    if (stripChars("123hello456", /[0-9]/, { mode: "start" }) !== "hello456") throw new Error("Expected stripChars('123hello456', /[0-9]/, { mode: 'start' }) to be 'hello456'");
    if (stripChars("123hello456", /[0-9]/, { mode: "end" }) !== "123hello") throw new Error("Expected stripChars('123hello456', /[0-9]/, { mode: 'end' }) to be '123hello'");
    if (stripChars("abc123xyz", /[a-z]/, { maxScanStart: 3, maxScanEnd: 3 }) !== "123") throw new Error("Expected stripChars('abc123xyz', /[a-z]/, { maxScanStart: 3, maxScanEnd: 3 }) to be '123'");
    if (stripChars("12abc34", /[a-z]/, { maxScanStart: 3, maxScanEnd: 3 }) !== "1234") throw new Error("Expected stripChars('12abc34', /[a-z]/, { maxScanStart: 3, maxScanEnd: 3 }) to be '1234'");

    // 8. stripChars with unlimited (-1 or null) scanning
    if (stripChars("aaloud", "lou", { maxScanStart: -1, maxScanEnd: 1 }) !== "aad") throw new Error("Expected -1 maxScanStart to do unlimited start scanning");
    if (stripChars("12abc34xyz56", /[a-z]/, { maxScanStart: null, maxScanEnd: null }) !== "123456") throw new Error("Expected null maxScanStart/End to do unlimited scanning");
    if (stripChars("12abc34xyz56", /[a-z]/, { maxScanStart: -1, maxScanEnd: 1 }) !== "1234xyz56") throw new Error("Expected -1 maxScanStart with 1 maxScanEnd to only strip start match");

    // 9. stripChars with multiple matches (maxMatchesStart / maxMatchesEnd)
    if (stripChars("alouloud", "ou", { maxScanStart: -1, maxMatchesStart: 2 }) !== "alld") throw new Error("Expected 2 matches to strip both ou blocks");
    if (stripChars("alouloud", "ou", { maxScanStart: -1, maxMatchesStart: 1 }) !== "alloud") throw new Error("Expected 1 match to only strip the first ou block");
    if (stripChars("abc12xyz34xyz56", "xyz", { maxScanEnd: -1, maxMatchesEnd: 2 }) !== "abc123456") throw new Error("Expected 2 matches from end to strip both xyz blocks");
    if (stripChars("alouloud", "ou", { maxScanStart: 4, maxMatchesStart: 2 }) !== "alld") throw new Error("Expected 2 matches to be allowed with maxScanStart 4");
    if (stripChars("alouloud", "ou", { maxScanStart: 3, maxMatchesStart: 2 }) !== "alloud") throw new Error("Expected only 1 match to be allowed with maxScanStart 3");

    // 10. stripChars with literal substring match
    if (stripChars("alouloud", "laou", { maxScanStart: -1, stringOptions: { literal: true } }) !== "alouloud") throw new Error("Expected literal laou to fail matching alouloud");
    if (stripChars("alou", "alou", { maxScanStart: -1, stringOptions: { literal: true } }) !== null) throw new Error("Expected literal alou to match alou");
    if (stripChars("abc12xyz34xyz56", "xyz", { maxScanEnd: -1, maxMatchesEnd: 2, stringOptions: { literal: true } }) !== "abc123456") throw new Error("Expected literal multi-match from end to succeed");

    // 11. stripChars with caseInsensitive option
    if (stripChars("aBcDeFg", "bdf", { maxScanStart: -1, maxScanEnd: -1, maxMatchesStart: -1, maxMatchesEnd: -1, stringOptions: { caseInsensitive: true } }) !== "aceg") throw new Error("Expected case-insensitive string character match to succeed");
    if (stripChars("aBcDeFg", /[bdf]/, { maxScanStart: -1, maxScanEnd: -1, maxMatchesStart: -1, maxMatchesEnd: -1 }) !== "aBcDeFg") throw new Error("Expected case-sensitive regex to remain case-sensitive");
    if (stripChars("aBcDeFg", /[bdf]/i, { maxScanStart: -1, maxScanEnd: -1, maxMatchesStart: -1, maxMatchesEnd: -1 }) !== "aceg") throw new Error("Expected case-insensitive regex with i flag match to succeed");
    if (stripChars("alOuLoUd", "ALOU", { maxScanStart: -1, stringOptions: { literal: true, caseInsensitive: true } }) !== "LoUd") throw new Error("Expected case-insensitive literal match to strip start");
    if (stripChars("AlOuAlOuD", "alou", { maxScanStart: -1, maxMatchesStart: 2, stringOptions: { literal: true, caseInsensitive: true } }) !== "D") throw new Error("Expected case-insensitive literal multi-match to succeed");

    console.log("🎉 ALL UTILS STRING TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("❌ UTILS STRING TESTS FAILED:", err);
    process.exit(1);
}
