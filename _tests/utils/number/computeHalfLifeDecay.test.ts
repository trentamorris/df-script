declare const process: any;
import { computeHalfLifeDecay } from "../../../src/utils/number";

console.log("=========================================");
console.log("STARTING COMPUTEHALFLIFEDECAY TESTS...");
console.log("=========================================");

let assertions = 0;

// Test 1: Delta = 0 -> weight = 1
{
    const d = computeHalfLifeDecay(0, 100);
    if (d !== 1) throw new Error(`Test 1 Failed: expected 1, got ${d}`);
    assertions++;
}

// Test 2: Delta = halfLife -> weight = 0.5
{
    const d = computeHalfLifeDecay(50, 50);
    if (Math.abs(d - 0.5) > 1e-12) throw new Error(`Test 2 Failed: expected 0.5, got ${d}`);
    assertions++;
}

// Test 3: Delta = 2 * halfLife -> weight = 0.25
{
    const d = computeHalfLifeDecay(200, 100);
    if (Math.abs(d - 0.25) > 1e-12) throw new Error(`Test 3 Failed: expected 0.25, got ${d}`);
    assertions++;
}

// Test 4: Negative delta clamped to 0 (future observations do not amplify past observations)
{
    const d = computeHalfLifeDecay(-50, 100);
    if (d !== 1) throw new Error(`Test 4 Failed: expected 1 for negative delta, got ${d}`);
    assertions++;
}

console.log(`SUCCESS: All computeHalfLifeDecay tests passed! (${assertions} assertions)`);
console.log("=========================================");
