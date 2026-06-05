declare const process: any;
import { $tbl } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION LIST NAMESPACE TESTS...");
console.log("=========================================");

const data = [
    {
        id: 1,
        numbers: [3, 1, 4, 1, 5, 9, 2, null, 6, 5],
        tags: ["apple", "banana", "apple", "cherry"],
        not_a_list: 42,
        empty_list: [],
        typed_array: new Int32Array([10, 20, 30]),
        string_nums: ["3", "1", "4"]
    },
    {
        id: 2,
        numbers: [10, -5, 20, 0],
        tags: ["js", "ts"],
        not_a_list: null,
        empty_list: null,
        typed_array: new Float64Array([1.5, 2.5]),
        string_nums: ["10"]
    }
];

try {
    const df = $tbl.data(data);
    const projected = df.select([
        // lengths / len
        $tbl.col("numbers").list.lengths().alias("len_nums"),
        $tbl.col("empty_list").list.len().alias("len_empty"),
        $tbl.col("not_a_list").list.len().alias("len_not_list"),

        // max / min / sum / mean / median / mode
        $tbl.col("numbers").list.max().alias("max_nums"),
        $tbl.col("numbers").list.min().alias("min_nums"),
        $tbl.col("numbers").list.sum().alias("sum_nums"),
        $tbl.col("numbers").list.mean().alias("mean_nums"),
        $tbl.col("numbers").list.median().alias("median_nums"),
        $tbl.col("tags").list.mode().alias("mode_tags"),

        // get / first / last
        $tbl.col("numbers").list.get(2).alias("get_idx_2"),
        $tbl.col("numbers").list.get(-2).alias("get_idx_neg_2"),
        $tbl.col("numbers").list.get(100).alias("get_out_of_bounds"),
        $tbl.col("tags").list.first().alias("first_tag"),
        $tbl.col("tags").list.last().alias("last_tag"),

        // contains
        $tbl.col("tags").list.contains("banana").alias("has_banana"),
        $tbl.col("tags").list.contains("orange").alias("has_orange"),

        // join
        $tbl.col("tags").list.join(", ").alias("joined_tags"),
        $tbl.col("numbers").list.join("-").alias("joined_nums_default"),
        $tbl.col("numbers").list.join("-", { ignoreNulls: true }).alias("joined_nums_ignore"),

        // sort
        $tbl.col("numbers").list.sort().alias("sorted_nums"),
        $tbl.col("numbers").list.sort(true).alias("sorted_nums_desc"),

        // reverse
        $tbl.col("tags").list.reverse().alias("reversed_tags"),

        // unique
        $tbl.col("tags").list.unique().alias("unique_tags"),
        $tbl.col("tags").list.n_unique().alias("n_unique_tags"),

        // slice
        $tbl.col("numbers").list.slice(2, 3).alias("slice_nums"),
        $tbl.col("numbers").list.slice(-4, 2).alias("slice_nums_neg"),

        // count_matches
        $tbl.col("tags").list.count_matches("apple").alias("apple_count"),
        $tbl.col("tags").list.count_matches("pear").alias("pear_count"),

        // gather / gather_every
        $tbl.col("numbers").list.gather([0, 2, -2]).alias("gather_nums"),
        $tbl.col("tags").list.gather(1).alias("gather_single"),
        $tbl.col("numbers").list.gather([0, 100]).alias("gather_oob_null"),
        $tbl.col("numbers").list.gather_every(2).alias("every_2"),
        $tbl.col("numbers").list.gather_every(3, 1).alias("every_3_offset_1"),
        $tbl.col("numbers").list.gather({ every: 2 }).alias("gather_every_config_list"),

        // Robustness features: TypedArray & String Coercion
        $tbl.col("typed_array").list.lengths().alias("typed_len"),
        $tbl.col("typed_array").list.sum().alias("typed_sum"),
        $tbl.col("string_nums").list.sum().alias("coerced_sum"),
        $tbl.col("string_nums").list.mean().alias("coerced_mean")
    ]).to_dicts() as any[];

    console.log("Coerced Expr.list results:");
    console.dir(projected, { depth: null });

    // Assert Row 0
    const r0 = projected[0];
    if (r0.len_nums !== 10) throw new Error(`Expected len_nums 10, got ${r0.len_nums}`);
    if (r0.len_empty !== 0) throw new Error(`Expected len_empty 0, got ${r0.len_empty}`);
    if (r0.len_not_list !== null) throw new Error(`Expected len_not_list null, got ${r0.len_not_list}`);

    if (r0.max_nums !== 9) throw new Error(`Expected max_nums 9, got ${r0.max_nums}`);
    if (r0.min_nums !== 1) throw new Error(`Expected min_nums 1, got ${r0.min_nums}`);
    if (r0.sum_nums !== 36) throw new Error(`Expected sum_nums 36 (3+1+4+1+5+9+2+6+5), got ${r0.sum_nums}`);
    if (Math.abs(r0.mean_nums - 36 / 9) > 1e-6) throw new Error(`Expected mean_nums 4, got ${r0.mean_nums}`);
    if (r0.median_nums !== 4) throw new Error(`Expected median_nums 4, got ${r0.median_nums}`);
    if (r0.mode_tags.length !== 1 || r0.mode_tags[0] !== "apple") throw new Error(`Expected mode_tags ["apple"], got ${r0.mode_tags}`);

    if (r0.get_idx_2 !== 4) throw new Error(`Expected get_idx_2 4, got ${r0.get_idx_2}`);
    if (r0.get_idx_neg_2 !== 6) throw new Error(`Expected get_idx_neg_2 6, got ${r0.get_idx_neg_2}`);
    if (r0.get_out_of_bounds !== null) throw new Error(`Expected get_out_of_bounds null, got ${r0.get_out_of_bounds}`);
    if (r0.first_tag !== "apple") throw new Error(`Expected first_tag 'apple', got ${r0.first_tag}`);
    if (r0.last_tag !== "cherry") throw new Error(`Expected last_tag 'cherry', got ${r0.last_tag}`);

    if (r0.has_banana !== true) throw new Error(`Expected has_banana true, got ${r0.has_banana}`);
    if (r0.has_orange !== false) throw new Error(`Expected has_orange false, got ${r0.has_orange}`);

    if (r0.joined_tags !== "apple, banana, apple, cherry") throw new Error(`Expected joined_tags, got ${r0.joined_tags}`);
    if (r0.joined_nums_default !== "3-1-4-1-5-9-2--6-5") throw new Error(`Expected r0.joined_nums_default '3-1-4-1-5-9-2--6-5', got ${r0.joined_nums_default}`);
    if (r0.joined_nums_ignore !== "3-1-4-1-5-9-2-6-5") throw new Error(`Expected r0.joined_nums_ignore '3-1-4-1-5-9-2-6-5', got ${r0.joined_nums_ignore}`);

    // sort checks (nulls go to the end)
    const expectedSort = [1, 1, 2, 3, 4, 5, 5, 6, 9, null];
    for (let i = 0; i < expectedSort.length; i++) {
        if (r0.sorted_nums[i] !== expectedSort[i]) {
            throw new Error(`Expected sorted_nums[${i}] to be ${expectedSort[i]}, got ${r0.sorted_nums[i]}`);
        }
    }
    const expectedSortDesc = [9, 6, 5, 5, 4, 3, 2, 1, 1, null];
    for (let i = 0; i < expectedSortDesc.length; i++) {
        if (r0.sorted_nums_desc[i] !== expectedSortDesc[i]) {
            throw new Error(`Expected sorted_nums_desc[${i}] to be ${expectedSortDesc[i]}, got ${r0.sorted_nums_desc[i]}`);
        }
    }

    // reverse
    if (r0.reversed_tags[0] !== "cherry" || r0.reversed_tags[3] !== "apple") {
        throw new Error(`Expected reversed_tags, got ${r0.reversed_tags}`);
    }

    // unique
    if (r0.unique_tags.length !== 3 || r0.unique_tags[0] !== "apple" || r0.unique_tags[1] !== "banana" || r0.unique_tags[2] !== "cherry") {
        throw new Error(`Expected unique_tags, got ${r0.unique_tags}`);
    }
    if (r0.n_unique_tags !== 3) {
        throw new Error(`Expected n_unique_tags 3, got ${r0.n_unique_tags}`);
    }

    // slice
    if (r0.slice_nums.length !== 3 || r0.slice_nums[0] !== 4 || r0.slice_nums[1] !== 1 || r0.slice_nums[2] !== 5) {
        throw new Error(`Expected slice_nums [4, 1, 5], got ${r0.slice_nums}`);
    }
    // slice_nums_neg is slice from -4 with length 2 => index 6 and 7 -> 2 and null
    if (r0.slice_nums_neg.length !== 2 || r0.slice_nums_neg[0] !== 2 || r0.slice_nums_neg[1] !== null) {
        throw new Error(`Expected slice_nums_neg [2, null], got ${r0.slice_nums_neg}`);
    }

    // gather / gather_every Row 0
    if (r0.gather_nums[0] !== 3 || r0.gather_nums[1] !== 4 || r0.gather_nums[2] !== 6) throw new Error("r0.gather_nums failed");
    if (r0.gather_single.length !== 1 || r0.gather_single[0] !== "banana") throw new Error("r0.gather_single failed");
    if (r0.gather_oob_null[0] !== 3 || r0.gather_oob_null[1] !== null) throw new Error("r0.gather_oob_null failed");
    if (r0.every_2.length !== 5 || r0.every_2[0] !== 3 || r0.every_2[1] !== 4 || r0.every_2[2] !== 5 || r0.every_2[3] !== 2 || r0.every_2[4] !== 6) throw new Error("r0.every_2 failed");
    if (r0.every_3_offset_1.length !== 3 || r0.every_3_offset_1[0] !== 1 || r0.every_3_offset_1[1] !== 5 || r0.every_3_offset_1[2] !== null) throw new Error("r0.every_3_offset_1 failed");
    if (r0.gather_every_config_list.length !== 5 || r0.gather_every_config_list[0] !== 3 || r0.gather_every_config_list[1] !== 4 || r0.gather_every_config_list[2] !== 5 || r0.gather_every_config_list[3] !== 2 || r0.gather_every_config_list[4] !== 6) throw new Error("r0.gather_every_config_list failed");

    // Robustness assertions Row 0
    if (r0.typed_len !== 3) throw new Error(`Expected r0.typed_len 3, got ${r0.typed_len}`);
    if (r0.typed_sum !== 60) throw new Error(`Expected r0.typed_sum 60, got ${r0.typed_sum}`);
    if (r0.coerced_sum !== 8) throw new Error(`Expected r0.coerced_sum 8, got ${r0.coerced_sum}`);
    if (Math.abs(r0.coerced_mean - 8 / 3) > 1e-6) throw new Error(`Expected r0.coerced_mean 2.6666, got ${r0.coerced_mean}`);

    // Assert Row 1
    const r1 = projected[1];
    if (r1.len_nums !== 4) throw new Error(`Expected len_nums 4, got ${r1.len_nums}`);
    if (r1.len_empty !== null) throw new Error(`Expected len_empty null, got ${r1.len_empty}`);
    if (r1.len_not_list !== null) throw new Error(`Expected len_not_list null, got ${r1.len_not_list}`);

    if (r1.max_nums !== 20) throw new Error(`Expected max_nums 20, got ${r1.max_nums}`);
    if (r1.min_nums !== -5) throw new Error(`Expected min_nums -5, got ${r1.min_nums}`);
    if (r1.sum_nums !== 25) throw new Error(`Expected sum_nums 25, got ${r1.sum_nums}`);
    if (r1.mean_nums !== 6.25) throw new Error(`Expected mean_nums 6.25, got ${r1.mean_nums}`);
    if (r1.median_nums !== 5) throw new Error(`Expected median_nums 5, got ${r1.median_nums}`);
    if (r1.mode_tags.length !== 2 || r1.mode_tags[0] !== "js" || r1.mode_tags[1] !== "ts") throw new Error(`Expected mode_tags ["js", "ts"], got ${r1.mode_tags}`);

    if (r1.get_idx_2 !== 20) throw new Error(`Expected get_idx_2 20, got ${r1.get_idx_2}`);
    if (r1.get_idx_neg_2 !== 20) throw new Error(`Expected get_idx_neg_2 20, got ${r1.get_idx_neg_2}`);
    if (r1.first_tag !== "js") throw new Error(`Expected first_tag 'js', got ${r1.first_tag}`);
    if (r1.last_tag !== "ts") throw new Error(`Expected last_tag 'ts', got ${r1.last_tag}`);
    if (r1.joined_nums_default !== "10--5-20-0") throw new Error(`Expected r1.joined_nums_default '10--5-20-0', got ${r1.joined_nums_default}`);
    if (r1.joined_nums_ignore !== "10--5-20-0") throw new Error(`Expected r1.joined_nums_ignore '10--5-20-0', got ${r1.joined_nums_ignore}`);

    // gather / gather_every Row 1
    if (r1.gather_nums[0] !== 10 || r1.gather_nums[1] !== 20 || r1.gather_nums[2] !== 20) throw new Error("r1.gather_nums failed");
    if (r1.gather_single.length !== 1 || r1.gather_single[0] !== "ts") throw new Error("r1.gather_single failed");
    if (r1.gather_oob_null[0] !== 10 || r1.gather_oob_null[1] !== null) throw new Error("r1.gather_oob_null failed");
    if (r1.every_2.length !== 2 || r1.every_2[0] !== 10 || r1.every_2[1] !== 20) throw new Error("r1.every_2 failed");
    if (r1.every_3_offset_1.length !== 1 || r1.every_3_offset_1[0] !== -5) throw new Error("r1.every_3_offset_1 failed");

    // Robustness assertions Row 1
    if (r1.typed_len !== 2) throw new Error(`Expected r1.typed_len 2, got ${r1.typed_len}`);
    if (r1.typed_sum !== 4) throw new Error(`Expected r1.typed_sum 4, got ${r1.typed_sum}`);
    if (r1.coerced_sum !== 10) throw new Error(`Expected r1.coerced_sum 10, got ${r1.coerced_sum}`);
    if (r1.coerced_mean !== 10) throw new Error(`Expected r1.coerced_mean 10, got ${r1.coerced_mean}`);
    if (r1.n_unique_tags !== 2) throw new Error(`Expected n_unique_tags 2, got ${r1.n_unique_tags}`);

    // Test null_on_oob = false throws
    let threwOob = false;
    try {
        df.select([
            $tbl.col("numbers").list.get(100, false)
        ]).to_dicts();
    } catch (e: any) {
        if (e.message && e.message.includes("out of bounds")) {
            threwOob = true;
        }
    }
    if (!threwOob) {
        throw new Error("Expected index out of bounds to throw when null_on_oob is false");
    }
    console.log("✓ null_on_oob=false bounds check passed");

    // Test null_on_oob = false throws in gather
    let threwGatherOob = false;
    try {
        df.select([
            $tbl.col("numbers").list.gather([0, 100], false)
        ]).to_dicts();
    } catch (e: any) {
        if (e.message && e.message.includes("out of bounds")) {
            threwGatherOob = true;
        }
    }
    if (!threwGatherOob) {
        throw new Error("Expected index out of bounds to throw in gather when null_on_oob is false");
    }
    console.log("✓ gather null_on_oob=false bounds check passed");

    console.log("\n🎉 ALL Expr.list COLUMN EXPRESSION TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Expr.list COLUMN EXPRESSION TESTS FAILED:", err);
    process.exit(1);
}
