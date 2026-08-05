declare const process: any;
import {
    stripChars,
    toCanonicalString,
    encodeHex,
    decodeHex,
    encodeBase64,
    decodeBase64,
    encodeString,
    decodeString,
    isBlankString,
    escapeRegExp,
    toWords,
    changeCase,
    decodeBase64URLToBase64,
    decodeBase64ToBytes,
    decodeBytesToJson,
    encodeObjectToJson,
    encodeJsonToBytes,
    encodeBytesToBase64,
    encodeBase64ToBase64URL
} from "../../src/utils/string";

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

    // 12. toCanonicalString tests
    if (toCanonicalString(null) !== "v:null") throw new Error("toCanonicalString(null) failed");
    if (toCanonicalString(undefined) !== "v:undefined") throw new Error("toCanonicalString(undefined) failed");
    if (toCanonicalString("hello") !== "s:5:hello") throw new Error("toCanonicalString('hello') failed");
    if (toCanonicalString(42) !== "number:42") throw new Error("toCanonicalString(42) failed");
    if (toCanonicalString(true) !== "boolean:true") throw new Error("toCanonicalString(true) failed");
    if (toCanonicalString(/abc/i) !== "r:6:/abc/i") throw new Error("toCanonicalString(/abc/i) failed");
    if (toCanonicalString(new Date(1777000)) !== "d:1777000") throw new Error("toCanonicalString(Date) failed");
    if (toCanonicalString(new Uint8Array([1, 2, 3])) !== "u:Uint8Array:5:1,2,3") throw new Error("toCanonicalString(Uint8Array) failed");
    if (toCanonicalString([1, [2, 3]]) !== "a:[number:1\x01a:[number:2\x01number:3]]") throw new Error("toCanonicalString(Array) failed");
    if (toCanonicalString({ b: 2, a: 1 }) !== "o:{s:1:a\x00number:1\x01s:1:b\x00number:2}") throw new Error("toCanonicalString(Object) failed");
    if (toCanonicalString({ b: [ { y: 2, x: 1 } ], a: new Date(100) }) !== "o:{s:1:a\x00d:100\x01s:1:b\x00a:[o:{s:1:x\x00number:1\x01s:1:y\x00number:2}]}") throw new Error("toCanonicalString(nested Object) failed");

    // 13. Map, Set, toJSON, and circular reference tests
    const set1 = new Set([2, 1]);
    const set2 = new Set([1, 2]);
    if (toCanonicalString(set1) !== "set:[number:1\x01number:2]") throw new Error("toCanonicalString(Set) failed");
    if (toCanonicalString(set1) !== toCanonicalString(set2)) throw new Error("toCanonicalString(Set) canonical sort failed");

    const map1 = new Map([["b", 2], ["a", 1]]);
    const map2 = new Map([["a", 1], ["b", 2]]);
    if (toCanonicalString(map1) !== "map:{s:1:a\x00number:1\x01s:1:b\x00number:2}") throw new Error("toCanonicalString(Map) failed");
    if (toCanonicalString(map1) !== toCanonicalString(map2)) throw new Error("toCanonicalString(Map) canonical sort failed");

    const customObj = {
        name: "test",
        toJSON() {
            return { id: 42 };
        }
    };
    if (toCanonicalString(customObj) !== "j:o:{s:2:id\x00number:42}") throw new Error("toCanonicalString(toJSON) failed");

    const circularObj: any = {};
    circularObj.self = circularObj;
    let expectedCircular = "o:{v:circular\x00v:circular}";
    for (let i = 0; i < 50; i++) {
        expectedCircular = `o:{s:4:self\x00${expectedCircular}}`;
    }
    if (toCanonicalString(circularObj) !== expectedCircular) throw new Error("toCanonicalString(circular) failed");

    // Custom maxDepth test
    let expectedCircularCustom = "o:{v:circular\x00v:circular}";
    for (let i = 0; i < 5; i++) {
        expectedCircularCustom = `o:{s:4:self\x00${expectedCircularCustom}}`;
    }
    if (toCanonicalString(circularObj, { maxDepth: 5 }) !== expectedCircularCustom) {
        throw new Error("toCanonicalString(circular, { maxDepth: 5 }) failed");
    }

    // 14. Encode & Decode string tests
    // Standard roundtrip
    if (encodeHex("hello") !== "68656c6c6f") throw new Error("encodeHex('hello') failed");
    if (decodeHex("68656c6c6f") !== "hello") throw new Error("decodeHex('68656c6c6f') failed");
    if (encodeBase64("hello") !== "aGVsbG8=") throw new Error("encodeBase64('hello') failed");
    if (decodeBase64("aGVsbG8=") !== "hello") throw new Error("decodeBase64('aGVsbG8=') failed");

    // Null and undefined
    if (encodeString(null, "hex") !== null) throw new Error("encodeString(null, 'hex') failed");
    if (encodeString(undefined, "base64") !== null) throw new Error("encodeString(undefined, 'base64') failed");
    if (decodeString(null, "hex") !== null) throw new Error("decodeString(null, 'hex') failed");
    if (decodeString(undefined, "base64") !== null) throw new Error("decodeString(undefined, 'base64') failed");

    // Edge cases: Hex validation & strict mode
    if (decodeHex("", false) !== "") throw new Error("decodeHex('', false) failed");
    if (decodeHex("   68656c6c6f   ") !== "hello") throw new Error("decodeHex whitespace trim failed");
    if (decodeHex("abc", false) !== null) throw new Error("decodeHex odd length should return null in non-strict mode");
    if (decodeHex("zz", false) !== null) throw new Error("decodeHex invalid hex char should return null in non-strict mode");

    let hexStrictFailed = false;
    try {
        decodeHex("invalid_hex", true);
    } catch {
        hexStrictFailed = true;
    }
    if (!hexStrictFailed) throw new Error("decodeHex in strict mode should throw on invalid hex");

    // Edge cases: Base64 validation & strict mode
    if (decodeBase64("", false) !== "") throw new Error("decodeBase64('', false) failed");
    if (decodeBase64("   aGVsbG8=   ") !== "hello") throw new Error("decodeBase64 whitespace trim failed");
    if (decodeBase64("invalid_base64!!!", false) !== null) throw new Error("decodeBase64 invalid format should return null in non-strict mode");

    let b64StrictFailed = false;
    try {
        decodeBase64("invalid_base64!!!", true);
    } catch {
        b64StrictFailed = true;
    }
    if (!b64StrictFailed) throw new Error("decodeBase64 in strict mode should throw on invalid base64");

    // Test mid-string '=' padding rejection
    if (decodeBase64("aGVs=bG8=", false) !== null) throw new Error("decodeBase64 with mid-string '=' should return null in non-strict mode");
    let midEqualStrictFailed = false;
    try {
        decodeBase64("aGVs=bG8=", true);
    } catch {
        midEqualStrictFailed = true;
    }
    if (!midEqualStrictFailed) throw new Error("decodeBase64 with mid-string '=' should throw in strict mode");

    // Non-string coercion
    if (encodeString(12345 as any, "hex") !== "3132333435") throw new Error("encodeString non-string coercion failed");
    if (decodeString("3132333435", "hex") !== "12345") throw new Error("decodeString non-string coercion failed");

    // Additional Edge Cases: Uppercase/Mixed Hex, Unicode/Emoji, Unsupported Encoding, Options object & Invalid UTF-8
    if (decodeHex("68656C6C6F") !== "hello") throw new Error("decodeHex uppercase hex failed");
    if (decodeHex("68656C6c6F") !== "hello") throw new Error("decodeHex mixed-case hex failed");

    const emojiStr = "Hello 🚀 World 🌍!";
    if (decodeHex(encodeHex(emojiStr)) !== emojiStr) throw new Error("Emoji unicode roundtrip failed for Hex");
    if (decodeBase64(encodeBase64(emojiStr)) !== emojiStr) throw new Error("Emoji unicode roundtrip failed for Base64");

    if (decodeString("invalid_hex", "hex", { strict: false }) !== null) throw new Error("decodeString options object { strict: false } failed");
    let optionsStrictFailed = false;
    try {
        decodeString("invalid_hex", "hex", { strict: true });
    } catch {
        optionsStrictFailed = true;
    }
    if (!optionsStrictFailed) throw new Error("decodeString options object { strict: true } failed");

    let unsupportedEncFailed = false;
    try {
        encodeString("test", "binary" as any);
    } catch {
        unsupportedEncFailed = true;
    }
    if (!unsupportedEncFailed) throw new Error("encodeString unsupported encoding check failed");

    let invalidUtf8HexFailed = false;
    try {
        decodeHex("ff", true);
    } catch {
        invalidUtf8HexFailed = true;
    }
    if (!invalidUtf8HexFailed) throw new Error("decodeHex strict mode invalid UTF-8 byte failed");

    let invalidUtf8B64Failed = false;
    try {
        decodeBase64("/w==", true);
    } catch {
        invalidUtf8B64Failed = true;
    }
    if (!invalidUtf8B64Failed) throw new Error("decodeBase64 strict mode invalid UTF-8 byte failed");

    // 15. URL-safe Base64 & Unpadded Base64 decoding
    if (decodeBase64("aGVsbG8", false) !== "hello") throw new Error("Unpadded base64 decoding failed");
    if (decodeBase64("aGVsbG8", true) !== "hello") throw new Error("Unpadded base64 strict decoding failed");
    const urlSafeB64 = encodeBase64("hello?world>").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    if (decodeBase64(urlSafeB64, true) !== "hello?world>") throw new Error("URL-safe base64 decoding failed");

    // 16. Large string Base64 chunking test (> 8192 bytes)
    const largeStr = "A".repeat(25000);
    const encodedLarge = encodeBase64(largeStr);
    const decodedLarge = decodeBase64(encodedLarge);
    if (decodedLarge !== largeStr) throw new Error("Large string (>8192 bytes) base64 encode/decode failed");

    // 17. isBlankString tests
    if (!isBlankString("")) throw new Error("isBlankString('') failed");
    if (!isBlankString("   \t\n\r")) throw new Error("isBlankString whitespace failed");
    if (isBlankString("  a  ")) throw new Error("isBlankString('  a  ') failed");
    if (isBlankString(123)) throw new Error("isBlankString(123) failed");
    if (isBlankString(null)) throw new Error("isBlankString(null) failed");
    if (!isBlankString(new String("   "))) throw new Error("isBlankString boxed String failed");

    // 18. escapeRegExp tests
    const escapedSpecial = escapeRegExp(".*+?^${}()|[]\\/-");
    if (typeof (RegExp as any).escape === "function") {
        if (escapedSpecial !== (RegExp as any).escape(".*+?^${}()|[]\\/-")) throw new Error("escapeRegExp native mismatch");
    } else {
        if (escapedSpecial !== "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\\\/\\-") throw new Error("escapeRegExp fallback mismatch: " + escapedSpecial);
    }
    if (escapeRegExp(null) !== "") throw new Error("escapeRegExp(null) failed");
    if (escapeRegExp(new String("a.b")) !== "a\\.b") throw new Error("escapeRegExp unboxed String failed");

    // 19. toWords & changeCase edge cases
    if (toWords(null).length !== 0) throw new Error("toWords(null) failed");
    if (toWords("__proto__ constructor prototype").length !== 0) throw new Error("toWords prototype pollution guard failed");
    if (changeCase("don't break APIs", { format: "camel" }) !== "dontBreakApis") throw new Error("changeCase contraction + acronym plural failed");
    if (changeCase("coopération_api", { format: "pascal" }) !== "CoopérationApi") throw new Error("changeCase Unicode failed");
    if (changeCase("hello_world", { format: "title" }) !== "Hello World") throw new Error("changeCase title format failed");
    if (changeCase("HELLO WORLD", { format: "title" }) !== "Hello World") throw new Error("changeCase title uppercase normalization failed");
    if (changeCase("don't stop", { format: "title" }) !== "Dont Stop") throw new Error("changeCase title contraction failed");
    if (changeCase("coopération_api", { format: "title" }) !== "Coopération Api") throw new Error("changeCase title Unicode failed");
    if (decodeBase64URLToBase64("aGVsbG8_d29ybGQ") !== "aGVsbG8/d29ybGQ=") throw new Error("decodeBase64URLToBase64 failed");
    if (decodeString(undefined, "base64") !== null) throw new Error("decodeString(undefined, 'base64') failed");

    // 20. Atomic Base64URL, Base64ToBytes, and BytesToJson tests
    if (decodeBase64URLToBase64("aGVsbG8_d29ybGQ") !== "aGVsbG8/d29ybGQ=") throw new Error("decodeBase64URLToBase64 failed");
    const bytes = decodeBase64ToBytes("aGVsbG8=");
    if (!(bytes instanceof Uint8Array) || bytes.length !== 5) throw new Error("decodeBase64ToBytes failed");
    const jsonPayload = decodeBytesToJson(new TextEncoder().encode(JSON.stringify({ key: "value" }))) as any;
    if (jsonPayload?.key !== "value") throw new Error("decodeBytesToJson failed");

    // 21. Atomic Encoding tests
    if (encodeObjectToJson({ num: 10n }) !== '{"num":"10"}') throw new Error("encodeObjectToJson BigInt failed");
    if (encodeObjectToJson(Object(123n)) !== "123") throw new Error("encodeObjectToJson boxed BigInt failed");
    if (encodeObjectToJson(99999999999999999999999999999999n) !== "99999999999999999999999999999999") throw new Error("encodeObjectToJson out of range BigInt failed");
    
    const encodedJsonBytes = encodeJsonToBytes("hello");
    if (!(encodedJsonBytes instanceof Uint8Array) || encodedJsonBytes.length !== 5) throw new Error("encodeJsonToBytes failed");
    
    const nonStrBytes = encodeJsonToBytes(123 as any);
    if (!(nonStrBytes instanceof Uint8Array) || nonStrBytes.length !== 3) throw new Error("encodeJsonToBytes non-string coercion failed");

    if (encodeBytesToBase64(encodedJsonBytes) !== "aGVsbG8=") throw new Error("encodeBytesToBase64 failed");
    if (encodeBytesToBase64(null as any) !== "") throw new Error("encodeBytesToBase64 null check failed");
    if (encodeBytesToBase64([104, 101, 108, 108, 111] as any) !== "aGVsbG8=") throw new Error("encodeBytesToBase64 array coercion failed");

    // Test large byte array chunking (> 8192 bytes)
    const largeBytes = new Uint8Array(10000);
    largeBytes.fill(65); // 'A'
    const largeB64 = encodeBytesToBase64(largeBytes);
    if (typeof largeB64 !== "string" || largeB64.length === 0) throw new Error("encodeBytesToBase64 large chunking failed");

    if (encodeBase64ToBase64URL("aGVsbG8/d29ybGQ=") !== "aGVsbG8_d29ybGQ") throw new Error("encodeBase64ToBase64URL failed");

    // 22. Additional Encoding/Decoding Edge Cases & Boundary Tests
    // 22a. Boolean and BigInt primitive input handling
    if (encodeString(true as any, "hex") !== "74727565") throw new Error("encodeString(true, 'hex') failed");
    if (encodeString(100n as any, "base64") !== "MTAw") throw new Error("encodeString(100n, 'base64') failed");
    if (decodeString("74727565", "hex") !== "true") throw new Error("decodeString('74727565', 'hex') failed");

    // 22b. Control characters and null bytes in string encoding
    const ctrlStr = "\0\n\r\t";
    if (decodeHex(encodeHex(ctrlStr)) !== ctrlStr) throw new Error("Control characters hex roundtrip failed");
    if (decodeBase64(encodeBase64(ctrlStr)) !== ctrlStr) throw new Error("Control characters base64 roundtrip failed");

    // 22c. Non-strict decode failure returning null for invalid hex format
    if (decodeHex("invalid_hex!", false) !== null) throw new Error("decodeHex invalid hex string should return null in non-strict mode");
    if (decodeBase64("invalid_b64!", false) !== null) throw new Error("decodeBase64 invalid base64 string should return null in non-strict mode");
    if (decodeHex("ffff", false) !== "\uFFFD\uFFFD") throw new Error("decodeHex non-strict mode should use replacement chars for invalid UTF-8");

    // 22d. Base64URL decoding with various missing padding lengths
    if (decodeBase64(encodeBase64ToBase64URL("aGVsbG8="), true) !== "hello") throw new Error("Base64URL decoding with missing '=' failed");
    if (decodeBase64("aGVsbG93b3JsZA", true) !== "helloworld") throw new Error("Base64URL decoding with missing double padding failed");

    console.log("🎉 ALL UTILS STRING TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("❌ UTILS STRING TESTS FAILED:", err);
    process.exit(1);
}
