import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING KURTOSIS AGGREGATION TESTS...");
console.log("=========================================");

try {
    const df = $df.data({
        a: [1, 2, 3, 4, 5],
        b: [1, 1, 1, 1, 1]
    });

    // 1. Biased Fisher kurtosis (fisher=true, bias=true) -> default: -1.3
    const resDefault = df.select($df.col("a").kurtosis().alias("kurt_def")).to_dicts();
    const g2 = resDefault[0].kurt_def;
    if (Math.abs(g2 - (-1.3)) > 1e-4) throw new Error(`kurtosis default failed: ${g2}`);

    // 2. Biased Pearson kurtosis (fisher=false, bias=true) -> 1.7
    const resPearson = df.select($df.col("a").kurtosis({ fisher: false }).alias("kurt_pearson")).to_dicts();
    const a4 = resPearson[0].kurt_pearson;
    if (Math.abs(a4 - 1.7) > 1e-4) throw new Error(`kurtosis pearson failed: ${a4}`);

    // 3. Unbiased Fisher kurtosis (fisher=true, bias=false) -> -1.2
    const resUnbiased = df.select($df.col("a").kurtosis({ bias: false }).alias("kurt_unbiased")).to_dicts();
    const G2 = resUnbiased[0].kurt_unbiased;
    if (Math.abs(G2 - (-1.2)) > 1e-4) throw new Error(`kurtosis unbiased failed: ${G2}`);

    // 4. Unbiased Pearson kurtosis (fisher=false, bias=false) -> 1.8 (G2 + 3)
    const resUnbiasedPearson = df.select($df.col("a").kurtosis({ fisher: false, bias: false }).alias("kurt_unbiased_pearson")).to_dicts();
    const G2Pearson = resUnbiasedPearson[0].kurt_unbiased_pearson;
    if (Math.abs(G2Pearson - 1.8) > 1e-4) throw new Error(`unbiased Pearson kurtosis failed: ${G2Pearson}`);

    // 5. N = 3 dataset: biased kurtosis succeeds (-1.5), unbiased returns null (N < 4)
    const df3 = $df.data({ val: [1, 2, 10] });
    const resN3Biased = df3.select($df.col("val").kurtosis({ bias: true }).alias("kurt_n3_biased")).to_dicts();
    if (Math.abs(resN3Biased[0].kurt_n3_biased - (-1.5)) > 1e-4) throw new Error(`N=3 biased kurtosis failed: ${resN3Biased[0].kurt_n3_biased}`);

    const resN3Unbiased = df3.select($df.col("val").kurtosis({ bias: false }).alias("kurt_n3_unbiased")).to_dicts();
    if (resN3Unbiased[0].kurt_n3_unbiased !== null) throw new Error(`N=3 unbiased kurtosis should return null, got: ${resN3Unbiased[0].kurt_n3_unbiased}`);

    // 6. Zero variance test -> null
    const resZeroVar = df.select($df.col("b").kurtosis().alias("kurt_zero")).to_dicts();
    if (resZeroVar[0].kurt_zero !== null) throw new Error(`kurtosis zero variance failed: ${resZeroVar[0].kurt_zero}`);


    // 5. Grouped aggregation test
    const dfGrouped = $df.data({
        group: ["g1", "g1", "g1", "g1", "g1", "g2", "g2"],
        val: [1, 2, 3, 4, 5, 10, 10]
    });

    const resGrouped = dfGrouped.groupby("group").agg($df.col("val").kurtosis().alias("kurt_val")).to_dicts();

    const g1Row = resGrouped.find(r => r.group === "g1");
    const g2Row = resGrouped.find(r => r.group === "g2");

    if (Math.abs(g1Row.kurt_val - (-1.3)) > 1e-4) throw new Error(`grouped kurtosis failed: ${g1Row.kurt_val}`);
    if (g2Row.kurt_val !== null) throw new Error(`grouped kurtosis zero var failed: ${g2Row.kurt_val}`);

    console.log("✓ All kurtosis aggregation tests passed!");
} catch (e) {
    console.error("❌ kurtosis aggregation tests failed!", e);
    throw e;
}
