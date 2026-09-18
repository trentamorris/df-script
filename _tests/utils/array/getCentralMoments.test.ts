declare const process: any;
import { getCentralMoments } from "../../../src/utils/array";

console.log("Starting getCentralMoments tests...");

try {
    // 1. Basic unweighted moments
    const data = [1, 2, 3, 4, 5];
    const res = getCentralMoments(data);
    if (!res) throw new Error("Expected getCentralMoments to return stats");
    if (res.count !== 5) throw new Error(`Expected count 5, got ${res.count}`);
    if (res.mean !== 3) throw new Error(`Expected mean 3, got ${res.mean}`);
    // m2Sum = (-2)^2 + (-1)^2 + 0 + 1^2 + 2^2 = 4 + 1 + 0 + 1 + 4 = 10
    if (res.m2Sum !== 10) throw new Error(`Expected m2Sum 10, got ${res.m2Sum}`);
    // m3Sum = (-2)^3 + (-1)^3 + 0 + 1^3 + 2^3 = -8 - 1 + 0 + 1 + 8 = 0 (symmetric)
    if (Math.abs(res.m3Sum) > 1e-6) throw new Error(`Expected m3Sum ~0, got ${res.m3Sum}`);
    // m4Sum = (-2)^4 + (-1)^4 + 0 + 1^4 + 2^4 = 16 + 1 + 0 + 1 + 16 = 34
    if (res.m4Sum !== 34) throw new Error(`Expected m4Sum 34, got ${res.m4Sum}`);
    // variance = 10 / 5 = 2
    if (res.variance !== 2) throw new Error(`Expected variance 2, got ${res.variance}`);
    // std = sqrt(2)
    if (Math.abs(res.std! - Math.SQRT2) > 1e-6) throw new Error(`Expected std sqrt(2), got ${res.std}`);

    // 2. Weighted moments (equal weights behave identical to unweighted)
    const weightsEqual = [2, 2, 2, 2, 2];
    const resEqual = getCentralMoments(data, weightsEqual);
    if (!resEqual) throw new Error("Expected weighted moments to return stats");
    if (resEqual.mean !== 3) throw new Error(`Expected mean 3, got ${resEqual.mean}`);
    if (resEqual.variance !== 2) throw new Error(`Expected variance 2, got ${resEqual.variance}`);

    // 3. Weighted moments (asymmetric weights)
    // vals: [10, 20], weights: [1, 3] -> sumW = 4, weightedSum = 10*1 + 20*3 = 70 -> mean = 17.5
    const resAsym = getCentralMoments([10, 20], [1, 3]);
    if (!resAsym || resAsym.mean !== 17.5) throw new Error(`Expected mean 17.5, got ${resAsym?.mean}`);
    // diffs: 10 - 17.5 = -7.5, 20 - 17.5 = 2.5
    // m2Sum: 1*(-7.5)^2 + 3*(2.5)^2 = 56.25 + 18.75 = 75
    // variance: 75 / 4 = 18.75
    if (resAsym.variance !== 18.75) throw new Error(`Expected variance 18.75, got ${resAsym.variance}`);

    // 4. Constant sequence (variance must be 0, clamped from float precision)
    const resConst = getCentralMoments([7, 7, 7, 7]);
    if (!resConst || resConst.variance !== 0 || resConst.std !== 0) {
        throw new Error(`Constant sequence variance must be 0, got ${resConst?.variance}`);
    }

    // 5. Embedded nulls and NaNs with weights
    const dirtyVals = [null, 10, NaN, 20, undefined, 30];
    const dirtyWeights = [1, 1, 1, 1, 1, 1];
    const resDirty = getCentralMoments(dirtyVals, dirtyWeights);
    if (!resDirty || resDirty.count !== 3) {
        throw new Error(`Expected 3 valid observations, got ${resDirty?.count}`);
    }
    if (resDirty.mean !== 20) throw new Error(`Expected mean 20, got ${resDirty.mean}`);

    // 6. minSamples constraint
    if (getCentralMoments([1, 2, 3], null, { minSamples: 4 }) !== null) {
        throw new Error("minSamples constraint not respected");
    }

    // 7. TypedArray input support
    const typed = new Float64Array([2, 4, 4, 4, 5, 5, 7, 9]);
    const resTyped = getCentralMoments(typed);
    if (!resTyped || resTyped.count !== 8) throw new Error("TypedArray moments failed");

    // 8. adjust: false for weighted sum
    const resUnadjusted = getCentralMoments([10, 20], [1, 2], { adjust: false });
    // total = 10*1 + 20*2 = 50
    if (!resUnadjusted || resUnadjusted.mean !== 50) {
        throw new Error(`Expected unadjusted sum 50, got ${resUnadjusted?.mean}`);
    }

    // 9. Defensive check for empty or invalid input
    if (getCentralMoments([]) !== null || getCentralMoments(null as any) !== null || getCentralMoments("not an array" as any) !== null) {
        throw new Error("Empty, null, or invalid input should return null");
    }

    // Edge Case 10: All-zero weights (sumW = 0, should avoid division by zero NaN)
    const zeroWeightsRes = getCentralMoments([10, 20, 30], [0, 0, 0]);
    if (!zeroWeightsRes || zeroWeightsRes.mean !== 0 || zeroWeightsRes.variance !== 0) {
        throw new Error(`All zero weights failed: ${JSON.stringify(zeroWeightsRes)}`);
    }

    // Edge Case 11: Single element with minSamples: 1 (variance & std must be 0)
    const singleRes = getCentralMoments([100], null, { minSamples: 1 });
    if (!singleRes || singleRes.count !== 1 || singleRes.mean !== 100 || singleRes.variance !== 0 || singleRes.std !== 0) {
        throw new Error(`Single element minSamples:1 failed: ${JSON.stringify(singleRes)}`);
    }

    // Edge Case 12: Extreme numbers (huge magnitudes scale invariance)
    const hugeVals = [1e12, 2e12, 3e12];
    const hugeRes = getCentralMoments(hugeVals);
    if (!hugeRes || hugeRes.mean !== 2e12 || Math.abs(hugeRes.variance! - (2/3)*1e24) > 1e18) {
        throw new Error(`Extreme magnitude calculation failed: ${JSON.stringify(hugeRes)}`);
    }

    // Edge Case 13: All negative numbers with weights
    const negVals = [-30, -20, -10];
    const negWeights = [1, 2, 1];
    // mean: (-30*1 + -20*2 + -10*1) / 4 = -80 / 4 = -20
    // diffs: -10, 0, 10 -> m2Sum: 1*100 + 2*0 + 1*100 = 200 -> var = 200 / 4 = 50
    const negRes = getCentralMoments(negVals, negWeights);
    if (!negRes || negRes.mean !== -20 || negRes.variance !== 50) {
        throw new Error(`Negative numbers with weights failed: ${JSON.stringify(negRes)}`);
    }

    // Edge Case 14: Weights array shorter than values array (missing weights default to 0)
    const shortWeightsRes = getCentralMoments([10, 20, 30, 40], [1, 1]);
    // only first 2 items have weight 1: sumW=2, mean = (10+20)/2 = 15
    if (!shortWeightsRes || shortWeightsRes.mean !== 15 || shortWeightsRes.sumW !== 2) {
        throw new Error(`Short weights array handling failed: ${JSON.stringify(shortWeightsRes)}`);
    }

    // Edge Case 15: String numbers coerces cleanly via toValidNumber
    const stringNums = ["10", "20", "30"];
    const strRes = getCentralMoments(stringNums);
    if (!strRes || strRes.mean !== 20 || strRes.count !== 3) {
        throw new Error(`String number coercion failed: ${JSON.stringify(strRes)}`);
    }

    console.log("✓ getCentralMoments tests passed!");
} catch (err: any) {
    console.error(`❌ getCentralMoments test failed: ${err.message}`);
    process.exit(1);
}
