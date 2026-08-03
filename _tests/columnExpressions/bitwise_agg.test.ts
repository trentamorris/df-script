import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src";

console.log("=========================================");
console.log("STARTING BITWISE AGGREGATION TESTS...");
console.log("=========================================");

try {
    const df = new DataFrame({ val: [0b110, 0b011] }); // 6 and 3

    // AND: 0b110 & 0b011 = 0b010 = 2
    const resAnd = df.select($df.col("val").bitwise_and().alias("res")).to_dict();
    if (resAnd.res[0] !== 2) throw new Error(`Expected bitwise_and 2, got ${resAnd.res[0]}`);

    // OR: 0b110 | 0b011 = 0b111 = 7
    const resOr = df.select($df.col("val").bitwise_or().alias("res")).to_dict();
    if (resOr.res[0] !== 7) throw new Error(`Expected bitwise_or 7, got ${resOr.res[0]}`);

    // XOR: 0b110 ^ 0b011 = 0b101 = 5
    const resXor = df.select($df.col("val").bitwise_xor().alias("res")).to_dict();
    if (resXor.res[0] !== 5) throw new Error(`Expected bitwise_xor 5, got ${resXor.res[0]}`);

    // Test large integer > 2^31 - 1 (3 billion: 3000000000)
    const dfLarge = new DataFrame({ val: [3000000000, 1] });
    const resLargeOr = dfLarge.select($df.col("val").bitwise_or().alias("res")).to_dict();
    if (resLargeOr.res[0] !== 3000000001) throw new Error(`Expected large bitwise_or 3000000001, got ${resLargeOr.res[0]}`);

    console.log("BITWISE AGGREGATION TESTS PASSED SUCCESSFULLY!");
} catch (err: any) {
    console.error("BITWISE AGGREGATION TEST FAILED:", err?.message || err);
    throw err;
}
