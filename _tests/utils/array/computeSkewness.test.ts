declare const process: any;
import { computeSkewness } from "../../../src/utils/array";

try {
    const symmetric = [1, 2, 3, 4, 5];
    const skew = computeSkewness(symmetric);
    if (skew === null || Math.abs(skew) > 1e-6) {
        throw new Error(`Expected symmetric skewness ~0, got ${skew}`);
    }

    const rightSkewed = [1, 2, 2, 3, 10];
    const rSkew = computeSkewness(rightSkewed);
    if (rSkew === null || rSkew <= 0) {
        throw new Error(`Expected positive skewness, got ${rSkew}`);
    }

    // Edge case 1: Constant sequence (variance = 0) returns null
    if (computeSkewness([42, 42, 42, 42]) !== null) {
        throw new Error("Constant sequence should return null skewness");
    }

    // Edge case 2: Embedded nulls and single valid value
    if (computeSkewness([null, 10, null, null]) !== null) {
        throw new Error("Single valid value should return null skewness");
    }

    // Edge case 3: Float64Array input with negative skew
    const leftSkewed = new Float64Array([1, 8, 9, 10, 10]);
    const lSkew = computeSkewness(leftSkewed);
    if (lSkew === null || lSkew >= 0) {
        throw new Error(`Expected negative skewness, got ${lSkew}`);
    }

    // Edge case 4: Fewer than 3 values with bias: false
    if (computeSkewness([1, 2], { bias: false }) !== null) {
        throw new Error("Fewer than 3 values with bias=false should return null");
    }

    // Edge case 5: Single element array returns null (needs >= 2 for mean/variance)
    if (computeSkewness([100]) !== null || computeSkewness([]) !== null) {
        throw new Error("Empty or single-element array should return null");
    }

    // Edge case 6: Huge magnitude numbers without precision overflow (scale invariance)
    const bigData = [1e12, 2e12, 2e12, 3e12, 10e12];
    const bigSkew = computeSkewness(bigData);
    if (bigSkew === null || Math.abs(bigSkew - rSkew) > 1e-4) {
        throw new Error(`Scale invariance violated: expected ~${rSkew}, got ${bigSkew}`);
    }

    // Edge case 7: All negative values preserving correct skew sign
    const negData = [-10, -3, -2, -2, -1];
    const negSkew = computeSkewness(negData);
    if (negSkew === null || negSkew >= 0) {
        throw new Error(`Expected negative skewness for negData, got ${negSkew}`);
    }

    // Edge case 8: NaN and undefined values mixed with numbers
    const mixedInvalid = [NaN, 1, 2, undefined, 2, 3, 10, null];
    const mixedSkew = computeSkewness(mixedInvalid);
    if (mixedSkew === null || Math.abs(mixedSkew - rSkew) > 1e-4) {
        throw new Error(`Expected mixed invalid values to filter cleanly, got ${mixedSkew}`);
    }

    // Edge case 9: Bimodal symmetric distribution (skew ~ 0)
    const bimodal = [1, 1, 1, 10, 10, 10];
    const biSkew = computeSkewness(bimodal);
    if (biSkew === null || Math.abs(biSkew) > 1e-6) {
        throw new Error(`Expected bimodal symmetric skew ~ 0, got ${biSkew}`);
    }

    // Edge case 10: Unbiased adjustment scale factor correctness
    const biasedSkew = computeSkewness(rightSkewed, { bias: true });
    const unbiasedSkew = computeSkewness(rightSkewed, { bias: false });
    const n = 5;
    const expectedUnbiased = (Math.sqrt(n * (n - 1)) / (n - 2)) * biasedSkew!;
    if (unbiasedSkew === null || Math.abs(unbiasedSkew - expectedUnbiased) > 1e-5) {
        throw new Error(`Unbiased formula mismatch: expected ${expectedUnbiased}, got ${unbiasedSkew}`);
    }

    console.log("✓ computeSkewness tests passed!");
} catch (err: any) {
    console.error(`❌ computeSkewness test failed: ${err.message}`);
    process.exit(1);
}
