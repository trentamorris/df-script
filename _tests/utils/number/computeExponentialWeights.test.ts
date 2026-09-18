declare const process: any;
import { computeExponentialWeights } from "../../../src/utils/number";

console.log("=========================================");
console.log("STARTING COMPUTEEXPONENTIALWEIGHTS TESTS...");
console.log("=========================================");

let assertions = 0;

// Test 1: Length 1 is always [1]
{
    const w = computeExponentialWeights(1, 0.5);
    if (w.length !== 1 || w[0] !== 1) throw new Error(`Test 1 Failed: ${JSON.stringify(w)}`);
    assertions++;
}

// Test 2: Length 3 with alpha = 0.5 -> decay = 0.5 -> [0.25, 0.5, 1.0]
{
    const w = computeExponentialWeights(3, 0.5);
    if (w.length !== 3 || w[2] !== 1 || w[1] !== 0.5 || w[0] !== 0.25) {
        throw new Error(`Test 2 Failed: ${JSON.stringify(w)}`);
    }
    assertions++;
}

// Test 3: Alpha = 1.0 -> zero memory -> all preceding are 0, last is 1
{
    const w = computeExponentialWeights(4, 1.0);
    if (w[0] !== 0 || w[1] !== 0 || w[2] !== 0 || w[3] !== 1) {
        throw new Error(`Test 3 Failed: ${JSON.stringify(w)}`);
    }
    assertions++;
}

// Test 4: Length 0 returns empty array
{
    const w = computeExponentialWeights(0, 0.5);
    if (w.length !== 0) throw new Error("Test 4 Failed: length 0 should return empty array");
    assertions++;
}

console.log(`SUCCESS: All computeExponentialWeights tests passed! (${assertions} assertions)`);
console.log("=========================================");
