declare const process: any;
import { isArrayOfType } from "../../utils/types";

console.log("=========================================");
console.log("STARTING UTILS TYPES TESTS...");
console.log("=========================================");

try {
    // Test numbers
    if (!isArrayOfType([1, 2, 3, null], "number")) throw new Error("Expected [1, 2, 3, null] to be of type 'number'");
    if (isArrayOfType([1, "2", 3], "number")) throw new Error("Expected [1, '2', 3] to not be of type 'number'");

    // Test strings
    if (!isArrayOfType(["a", "b", null, "c"], "string")) throw new Error("Expected ['a', 'b', null, 'c'] to be of type 'string'");
    if (isArrayOfType(["a", 1, "c"], "string")) throw new Error("Expected ['a', 1, 'c'] to not be of type 'string'");

    // Test booleans
    if (!isArrayOfType([true, false, null], "boolean")) throw new Error("Expected [true, false, null] to be of type 'boolean'");
    if (isArrayOfType([true, 0], "boolean")) throw new Error("Expected [true, 0] to not be of type 'boolean'");

    // Test dates
    if (!isArrayOfType([new Date(), null], "date")) throw new Error("Expected Date array to be of type 'date'");
    if (isArrayOfType([new Date(), "invalid"], "date")) throw new Error("Expected mixed Date/string array to not be of type 'date'");

    // Test objects
    if (!isArrayOfType([{ a: 1 }, null, { b: 2 }], "object")) throw new Error("Expected Object array to be of type 'object'");
    if (isArrayOfType([{ a: 1 }, 123], "object")) throw new Error("Expected mixed Object/number array to not be of type 'object'");

    // Test custom predicate
    const isEven = (v: any) => typeof v === "number" && v % 2 === 0;
    if (!isArrayOfType([2, 4, 6], isEven)) throw new Error("Expected [2, 4, 6] to satisfy isEven");
    if (isArrayOfType([2, 5, 6], isEven)) throw new Error("Expected [2, 5, 6] to not satisfy isEven");

    // Test invalid array input
    if (isArrayOfType(42, "number")) throw new Error("Expected scalar to fail isArrayOfType");

    console.log("🎉 ALL UTILS TYPES TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("❌ UTILS TYPES TESTS FAILED:", err);
    process.exit(1);
}
