declare const process: any;
import { computeKurtosis } from "../../../src/utils/array";

try {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const kurt = computeKurtosis(data);
    if (kurt === null) throw new Error("Kurtosis calculation failed");

    // With bias: false, count < 4 returns null
    const shortData = [1, 2];
    if (computeKurtosis(shortData, { bias: false }) !== null) {
        throw new Error("Too few data points should return null with bias: false");
    }

    // Edge case 1: Constant sequence (variance = 0) returns null
    if (computeKurtosis([9, 9, 9, 9, 9]) !== null) {
        throw new Error("Constant sequence should return null kurtosis");
    }

    // Edge case 2: Embedded nulls with sufficient valid items
    const withNulls = [null, 1, 2, null, 3, 4, 5, null];
    const kWithNulls = computeKurtosis(withNulls);
    if (kWithNulls === null) throw new Error("Kurtosis with embedded nulls failed");

    // Edge case 3: Fisher = false (Pearson's kurtosis, where normal ~ 3 instead of ~ 0)
    const kPearson = computeKurtosis(data, { fisher: false });
    const kFisher = computeKurtosis(data, { fisher: true });
    if (kPearson === null || kFisher === null || Math.abs(kPearson - kFisher - 3) > 1e-6) {
        throw new Error(`Expected Pearson = Fisher + 3, got Pearson=${kPearson}, Fisher=${kFisher}`);
    }

    // Edge case 4: Non-array or invalid input returns null
    if (computeKurtosis(null as any) !== null || computeKurtosis("invalid" as any) !== null) {
        throw new Error("Invalid input should return null");
    }

    // Edge case 5: Empty and single-element inputs
    if (computeKurtosis([]) !== null || computeKurtosis([42]) !== null) {
        throw new Error("Empty or single-element input should return null");
    }

    // Edge case 6: Typed arrays (Int32Array)
    const typedArr = new Int32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const kTyped = computeKurtosis(typedArr);
    if (kTyped === null || Math.abs(kTyped - kurt) > 1e-6) {
        throw new Error(`Typed array kurtosis mismatch: expected ${kurt}, got ${kTyped}`);
    }

    // Edge case 7: Scale invariance (multiplying all values by 1000 preserves kurtosis)
    const scaledData = data.map(x => x * 1000);
    const kScaled = computeKurtosis(scaledData);
    if (kScaled === null || Math.abs(kScaled - kurt) > 1e-6) {
        throw new Error(`Scale invariance violated: expected ${kurt}, got ${kScaled}`);
    }

    // Edge case 8: All negative numbers
    const negKurtData = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1];
    const kNeg = computeKurtosis(negKurtData);
    if (kNeg === null || Math.abs(kNeg - kurt) > 1e-6) {
        throw new Error(`Negative symmetric kurtosis mismatch: expected ${kurt}, got ${kNeg}`);
    }

    // Edge case 9: Bimodal symmetric distribution (platykurtic / negative excess kurtosis)
    const bimodalData = [1, 1, 1, 1, 1, 10, 10, 10, 10, 10];
    const kBimodal = computeKurtosis(bimodalData);
    if (kBimodal === null || kBimodal >= 0) {
        throw new Error(`Expected platykurtic (negative excess kurtosis), got ${kBimodal}`);
    }

    // Edge case 10: Unbiased formula scale factor verification
    const biasedKurt = computeKurtosis(data, { bias: true, fisher: true });
    const unbiasedKurt = computeKurtosis(data, { bias: false, fisher: true });
    const N = data.length;
    const expectedUnbiasedKurt = ((N - 1) / ((N - 2) * (N - 3))) * ((N + 1) * biasedKurt! + 6);
    if (unbiasedKurt === null || Math.abs(unbiasedKurt - expectedUnbiasedKurt) > 1e-5) {
        throw new Error(`Unbiased kurtosis mismatch: expected ${expectedUnbiasedKurt}, got ${unbiasedKurt}`);
    }

    console.log("✓ computeKurtosis tests passed!");
} catch (err: any) {
    console.error(`❌ computeKurtosis test failed: ${err.message}`);
    process.exit(1);
}
