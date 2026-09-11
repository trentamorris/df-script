declare const process: any;
import { decodeString, encodeString } from "../../../src/utils/string";

console.log("=========================================");
console.log("STARTING DECODESTRING TESTS...");
console.log("=========================================");

let testsPassed = 0;

function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(`Assertion failed: ${msg}`);
    testsPassed++;
}

function assertEqual(actual: any, expected: any, msg: string) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
        throw new Error(`Assertion failed: ${msg}\n  Expected: ${e}\n  Actual:   ${a}`);
    }
    testsPassed++;
}

function assertThrows(fn: () => void, msg: string) {
    try {
        fn();
        throw new Error(`Expected function to throw: ${msg}`);
    } catch (err: any) {
        if (err.message.startsWith("Expected function to throw")) throw err;
        testsPassed++;
    }
}

try {
    // 1. Basic sanity
    assertEqual(decodeString("68656c6c6f", "hex"), "hello", "decodes simple ascii hex");
    assertEqual(decodeString("aGVsbG8=", "base64"), "hello", "decodes simple ascii base64");

    // 2. Null, undefined guards
    assertEqual(decodeString(null, "hex"), null, "null input returns null for hex");
    assertEqual(decodeString(null, "base64"), null, "null input returns null for base64");
    assertEqual(decodeString(undefined, "hex"), null, "undefined input returns null for hex");
    assertEqual(decodeString(undefined, "base64"), null, "undefined input returns null for base64");

    // 3. Empty string & whitespace trimming
    assertEqual(decodeString("", "hex"), "", "empty string decodes to empty for hex");
    assertEqual(decodeString("", "base64"), "", "empty string decodes to empty for base64");
    assertEqual(decodeString("   ", "hex"), "", "whitespace-only decodes to empty for hex");
    assertEqual(decodeString("   ", "base64"), "", "whitespace-only decodes to empty for base64");
    assertEqual(decodeString("  68656c6c6f  ", "hex"), "hello", "trims surrounding whitespace for hex");
    assertEqual(decodeString("  aGVsbG8=  ", "base64"), "hello", "trims surrounding whitespace for base64");
    assertEqual(decodeString("\t\r\n 68656c6c6f \n", "hex"), "hello", "trims tab and newline whitespace for hex");
    assertEqual(decodeString("\t\r\n aGVsbG8= \n", "base64"), "hello", "trims tab and newline whitespace for base64");

    // 4. Hex uppercase / lowercase / mixed case tolerance
    assertEqual(decodeString("68656C6C6F", "hex"), "hello", "handles uppercase hex characters");
    assertEqual(decodeString("68656c6C6f", "hex"), "hello", "handles mixed case hex characters");
    assertEqual(decodeString("00410A", "hex"), "\x00A\x0A", "handles uppercase hex with null and newline");

    // 5. Multibyte UTF-8 characters (Accented Latin, Greek, CJK, Astral plane emojis)
    assertEqual(decodeString("636166c3a9", "hex"), "café", "decodes multibyte accent in hex");
    assertEqual(decodeString("Y2Fmw6k=", "base64"), "café", "decodes multibyte accent in base64");

    assertEqual(decodeString("e4b8ade69687", "hex"), "中文", "decodes CJK characters in hex");
    assertEqual(decodeString("5Lit5paH", "base64"), "中文", "decodes CJK characters in base64");

    assertEqual(decodeString("f09f9a80", "hex"), "🚀", "decodes emoji in hex");
    assertEqual(decodeString("8J+agA==", "base64"), "🚀", "decodes emoji in base64");
    assertEqual(decodeString("f09f91a8e2808df09f91a9e2808df09f91a7e2808df09f91a6", "hex"), "👨‍👩‍👧‍👦", "decodes complex ZWJ emoji in hex");
    assertEqual(decodeString("8J+RqPCfj7vigI3wn42z", "base64"), "👨🏻‍🍳", "decodes complex skin-tone emoji sequence in base64");

    // 6. Binary zero & C0 Control Characters (NUL, etc.)
    assertEqual(decodeString("00", "hex"), "\0", "decodes NUL byte in hex");
    assertEqual(decodeString("AA==", "base64"), "\0", "decodes NUL byte in base64");
    assertEqual(decodeString("000000", "hex"), "\0\0\0", "decodes consecutive NUL bytes in hex");
    assertEqual(decodeString("AAAA", "base64"), "\0\0\0", "decodes consecutive NUL bytes in base64");
    assertEqual(decodeString("090d0a", "hex"), "\t\r\n", "decodes whitespace controls in hex");

    // 7. Base64 padding variations
    assertEqual(decodeString("YQ==", "base64"), "a", "1 byte with '==' padding");
    assertEqual(decodeString("YWI=", "base64"), "ab", "2 bytes with '=' padding");
    assertEqual(decodeString("YWJj", "base64"), "abc", "3 bytes with no padding");

    // 8. Large string decoding (>16KB and chunk boundary tests)
    const largeHex = "41".repeat(16384);
    assertEqual(decodeString(largeHex, "hex"), "A".repeat(16384), "decodes large hex buffer (>16KB)");
    const largeB64 = encodeString("B".repeat(16384), "base64")!;
    assertEqual(decodeString(largeB64, "base64"), "B".repeat(16384), "decodes large base64 buffer (>16KB)");

    // 9. Error handling: Strict mode vs Non-strict mode
    // Invalid Hex: Odd length
    assertThrows(() => decodeString("abc", "hex", { strict: true }), "strict mode throws on odd length hex");
    assertThrows(() => decodeString("abc", "hex", true), "boolean strict throws on odd length hex");
    assertEqual(decodeString("abc", "hex", { strict: false }), null, "non-strict mode returns null on odd length hex");
    assertEqual(decodeString("abc", "hex", false), null, "boolean false returns null on odd length hex");

    // Invalid Hex: Non-hex characters
    assertThrows(() => decodeString("68656c6c6z", "hex", { strict: true }), "strict throws on non-hex characters");
    assertEqual(decodeString("68656c6c6z", "hex", { strict: false }), null, "non-strict returns null on non-hex characters");
    assertThrows(() => decodeString("68 65", "hex", { strict: true }), "strict throws on internal space in hex");
    assertEqual(decodeString("68 65", "hex", { strict: false }), null, "non-strict returns null on internal space in hex");

    // Invalid Base64: Bad length (not multiple of 4)
    assertThrows(() => decodeString("aGVsbG", "base64", { strict: true }), "strict throws on bad length base64");
    assertEqual(decodeString("aGVsbG", "base64", { strict: false }), null, "non-strict returns null on bad length base64");

    // Invalid Base64: Illegal characters (e.g. URL-safe characters or symbols not valid in standard b64)
    assertThrows(() => decodeString("aGVsbG8?", "base64", { strict: true }), "strict throws on illegal character '?'");
    assertEqual(decodeString("aGVsbG8?", "base64", { strict: false }), null, "non-strict returns null on illegal character '?'");
    assertThrows(() => decodeString("a-b_c===", "base64", { strict: true }), "strict throws on URL-safe b64 characters");
    assertEqual(decodeString("a-b_c===", "base64", { strict: false }), null, "non-strict returns null on URL-safe b64 characters");
    assertThrows(() => decodeString("====", "base64", { strict: true }), "strict throws on all padding '===='");
    assertEqual(decodeString("====", "base64", { strict: false }), null, "non-strict returns null on all padding '===='");

    // Invalid UTF-8 byte sequences in strict vs non-strict
    // 0xFF or 0xC3 alone is not valid UTF-8
    assertThrows(() => decodeString("ff", "hex", { strict: true }), "strict throws on invalid UTF-8 byte 0xFF");
    assert(typeof decodeString("ff", "hex", { strict: false }) === "string", "non-strict recovers on invalid UTF-8 byte 0xFF using replacement character");
    assertThrows(() => decodeString("/w==", "base64", { strict: true }), "strict throws on invalid UTF-8 base64 ('/w==' is 0xFF)");
    assert(typeof decodeString("/w==", "base64", { strict: false }) === "string", "non-strict recovers on invalid UTF-8 base64 ('/w==') using replacement character");

    // 10. Unsupported encoding throwing
    assertThrows(() => decodeString("test", "binary" as any), "throws on unsupported encoding 'binary'");
    assertThrows(() => decodeString("test", "utf8" as any), "throws on unsupported encoding 'utf8'");

    console.log(`SUCCESS: All decodeString tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: decodeString test failed!`, err);
    process.exit(1);
}
