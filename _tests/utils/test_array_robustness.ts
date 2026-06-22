import { getArrayStats, computeMedian, computeQuantile, computeMode, sortArray } from "../../src/utils/array";

console.log("=========================================");
console.log("STARTING ARRAY UTILS ROBUSTNESS TESTS...");
console.log("=========================================");

try {
    // 1. Test getArrayStats with NaN elements
    const statsWithNaN = getArrayStats([NaN, 5, 2, NaN, 8]);
    if (statsWithNaN.min !== 2) {
        throw new Error(`Expected min to be 2, got ${statsWithNaN.min}`);
    }
    if (statsWithNaN.max !== 8) {
        throw new Error(`Expected max to be 8, got ${statsWithNaN.max}`);
    }
    if (statsWithNaN.nullCount !== 2) {
        throw new Error(`Expected nullCount to be 2, got ${statsWithNaN.nullCount}`);
    }
    if (statsWithNaN.count !== 3) {
        throw new Error(`Expected count to be 3, got ${statsWithNaN.count}`);
    }
    if (statsWithNaN.sum !== 15) {
        throw new Error(`Expected sum to be 15, got ${statsWithNaN.sum}`);
    }
    if (!statsWithNaN.isNumeric) {
        throw new Error(`Expected isNumeric to be true, got ${statsWithNaN.isNumeric}`);
    }
    console.log("✓ getArrayStats NaN exclusion and nullCount tracking passed");

    // 1b. Test getArrayStats with non-finite elements (Infinity, -Infinity)
    const statsWithInfinity = getArrayStats([Infinity, 5, 2, -Infinity]);
    if (statsWithInfinity.min !== -Infinity) {
        throw new Error(`Expected min to be -Infinity, got ${statsWithInfinity.min}`);
    }
    if (statsWithInfinity.max !== Infinity) {
        throw new Error(`Expected max to be Infinity, got ${statsWithInfinity.max}`);
    }
    if (statsWithInfinity.nullCount !== 0) {
        throw new Error(`Expected nullCount to be 0, got ${statsWithInfinity.nullCount}`);
    }
    if (statsWithInfinity.count !== 2) {
        throw new Error(`Expected count to be 2, got ${statsWithInfinity.count}`);
    }
    if (statsWithInfinity.sum !== 7) {
        throw new Error(`Expected sum to be 7, got ${statsWithInfinity.sum}`);
    }
    console.log("✓ getArrayStats Infinity/non-finite boundaries retention passed");

    // 2. Test coercion in computeMedian and computeQuantile
    const mixedNumericArray = ["10", true, 20, new Date(30000), false];
    // coerced values: 10, 1, 20, 30000, 0
    // sorted coerced values: 0, 1, 10, 20, 30000
    // median (middle element of 5 elements) = index 2 = 10
    const median = computeMedian(mixedNumericArray);
    if (median !== 10) {
        throw new Error(`Expected median to be 10, got ${median}`);
    }

    // quantile 0.75 of [0, 1, 10, 20, 30000]
    // index = 0.75 * 4 = 3 -> value at index 3 is 20
    const q75 = computeQuantile(mixedNumericArray, 0.75);
    if (q75 !== 20) {
        throw new Error(`Expected 0.75 quantile to be 20, got ${q75}`);
    }
    console.log("✓ computeMedian and computeQuantile type coercion passed");

    // 3. Test computeMode skipping NaN
    const modesWithNaN = computeMode([NaN, 5, 5, NaN, NaN, 2, 2]);
    // NaN is skipped, 5 appears twice, 2 appears twice. So modes are [2, 5] (sorted)
    if (!modesWithNaN || modesWithNaN.length !== 2 || modesWithNaN[0] !== 2 || modesWithNaN[1] !== 5) {
        throw new Error(`Expected modes to be [2, 5], got ${JSON.stringify(modesWithNaN)}`);
    }
    console.log("✓ computeMode NaN exclusion passed");

    // 4. Test sortArray mixed types (strict weak ordering & grouping by type)
    const mixedTypes = ["banana", 10, true, "apple", 2, false];
    const sortedMixed = sortArray(mixedTypes);
    
    // Check that elements of same type are grouped together and sorted
    // Booleans: false, true
    // Numbers: 2, 10
    // Strings: "apple", "banana"
    const expectedSorted = [false, true, 2, 10, "apple", "banana"];
    for (let i = 0; i < expectedSorted.length; i++) {
        if (sortedMixed[i] !== expectedSorted[i]) {
            throw new Error(`Expected sortedMixed[${i}] to be ${expectedSorted[i]}, got ${sortedMixed[i]}`);
        }
    }

    // Test descending sort
    const sortedMixedDesc = sortArray(mixedTypes, { descending: true });
    const expectedSortedDesc = ["banana", "apple", 10, 2, true, false];
    for (let i = 0; i < expectedSortedDesc.length; i++) {
        if (sortedMixedDesc[i] !== expectedSortedDesc[i]) {
            throw new Error(`Expected sortedMixedDesc[${i}] to be ${expectedSortedDesc[i]}, got ${sortedMixedDesc[i]}`);
        }
    }
    console.log("✓ sortArray mixed-type grouping and strict weak ordering passed");

} catch (err: any) {
    console.error("❌ Array robustness tests failed!");
    console.error(err);
    process.exit(1);
}

console.log("=========================================");
console.log("🎉 ALL ARRAY UTILS ROBUSTNESS TESTS PASSED SUCCESSFULLY!");
console.log("=========================================");
