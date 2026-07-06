declare const process: any;
import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION ARRAY NAMESPACE TESTS...");
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
    const df = $df.data(data);
    const projected = df.select([
        // lengths / len
        $df.col("numbers").arr.lengths().alias("len_nums"),
        $df.col("empty_list").arr.len().alias("len_empty"),
        $df.col("not_a_list").arr.len().alias("len_not_list"),

        // max / min / sum / mean / median / mode
        $df.col("numbers").arr.max().alias("max_nums"),
        $df.col("numbers").arr.min().alias("min_nums"),
        $df.col("numbers").arr.sum().alias("sum_nums"),
        $df.col("numbers").arr.mean().alias("mean_nums"),
        $df.col("numbers").arr.median().alias("median_nums"),
        $df.col("tags").arr.mode().alias("mode_tags"),

        // get / first / last
        $df.col("numbers").arr.get(2).alias("get_idx_2"),
        $df.col("numbers").arr.get(-2).alias("get_idx_neg_2"),
        $df.col("numbers").arr.get(100).alias("get_out_of_bounds"),
        $df.col("tags").arr.first().alias("first_tag"),
        $df.col("tags").arr.last().alias("last_tag"),

        // contains
        $df.col("tags").arr.contains("banana").alias("has_banana"),
        $df.col("tags").arr.contains("orange").alias("has_orange"),

        // join
        $df.col("tags").arr.join(", ").alias("joined_tags"),
        $df.col("numbers").arr.join("-").alias("joined_nums_default"),
        $df.col("numbers").arr.join("-", { ignoreNulls: true }).alias("joined_nums_ignore"),

        // sort
        $df.col("numbers").arr.sort().alias("sorted_nums"),
        $df.col("numbers").arr.sort({ descending: true }).alias("sorted_nums_desc"),
        $df.col("numbers").arr.sort({ descending: false, nullsLast: false }).alias("sorted_nums_nulls_first"),
        $df.col("numbers").arr.sort({ descending: true, nullsLast: false }).alias("sorted_nums_desc_nulls_first"),

        // reverse
        $df.col("tags").arr.reverse().alias("reversed_tags"),

        // unique
        $df.col("tags").arr.unique().alias("unique_tags"),
        $df.col("tags").arr.n_unique().alias("n_unique_tags"),

        // slice
        $df.col("numbers").arr.slice(2, 5).alias("slice_nums"),
        $df.col("numbers").arr.slice(-4, -2).alias("slice_nums_neg"),

        // count_matches
        $df.col("tags").arr.count_matches("apple").alias("apple_count"),
        $df.col("tags").arr.count_matches("pear").alias("pear_count"),

        // gather / gather_every
        $df.col("numbers").arr.gather([0, 2, -2]).alias("gather_nums"),
        $df.col("tags").arr.gather(1).alias("gather_single"),
        $df.col("numbers").arr.gather([0, 100]).alias("gather_oob_null"),
        $df.col("numbers").arr.gather_every({ step: 2 }).alias("every_2"),
        $df.col("numbers").arr.gather_every({ step: 3, offsetStart: 1 }).alias("every_3_offset_1"),
        $df.col("numbers").arr.gather_every({ step: 2, offsetStart: -1 }).alias("every_2_neg_offset"),
        $df.col("numbers").arr.gather_every({ step: -2, offsetStart: -1 }).alias("every_neg_2_neg_offset"),
        $df.col("numbers").arr.gather_every({ step: 2, offsetStart: -4 }).alias("every_pos_2_neg_offset"),
        $df.col("numbers").arr.gather_every({ step: -2, offsetStart: 4 }).alias("every_neg_2_offset_4"),
        $df.col("numbers").arr.gather_every({ step: 2, offsetStart: 1, offsetEnd: 7 }).alias("every_pos_step_start_end"),
        $df.col("numbers").arr.gather_every({ step: -2, offsetStart: 7, offsetEnd: 1 }).alias("every_neg_step_start_end"),
        $df.col("numbers").arr.gather_every({ step: 2, offsetStart: -9, offsetEnd: -3 }).alias("every_pos_step_neg_start_end"),
        $df.col("numbers").arr.gather_every({ step: -2, offsetStart: -3, offsetEnd: -9 }).alias("every_neg_step_neg_start_end"),
        $df.col("numbers").arr.gather_every({ step: 2, maxItemsGathered: 3 }).alias("every_2_limit_3"),

        // Robustness features: TypedArray & String Coercion
        $df.col("typed_array").arr.lengths().alias("typed_len"),
        $df.col("typed_array").arr.sum().alias("typed_sum"),
        $df.col("string_nums").arr.sum().alias("coerced_sum"),
        $df.col("string_nums").arr.mean().alias("coerced_mean"),
        $df.col("numbers").arr.gather(new Int32Array([0, 2, -2])).alias("gather_typed_indices"),
        $df.col("typed_array").arr.contains_all(new Int32Array([10, 30])).alias("typed_contains_all"),
        $df.col("typed_array").arr.contains_any(new Int32Array([10, 40])).alias("typed_contains_any"),
        $df.col("numbers").arr.max_index().alias("max_index_nums"),
        $df.col("numbers").arr.min_index().alias("min_index_nums"),
        $df.col("numbers").arr.shift(2).alias("shifted_nums_2"),
        $df.col("numbers").arr.shift(-1).alias("shifted_nums_neg_1"),
        $df.col("numbers").arr.std().alias("std_nums"),
        $df.col("numbers").arr.variance().alias("variance_nums"),
        $df.col("numbers").arr.splice(1, 2, 99, 100).alias("spliced_nums"),
        $df.col("numbers").arr.filter($df.element().is_not_null()).alias("dropped_nulls_nums"),
        $df.col("numbers").arr.filter($df.element().gt(4)).alias("filtered_nums")
    ]).to_dicts() as any[];

    console.log("Coerced Expr.arr results:");
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
    if (r0.max_index_nums !== 5) throw new Error(`Expected max_index_nums 5, got ${r0.max_index_nums}`);
    if (r0.min_index_nums !== 1) throw new Error(`Expected min_index_nums 1, got ${r0.min_index_nums}`);
    if (r0.shifted_nums_2[2] !== 3 || r0.shifted_nums_2[0] !== null || r0.shifted_nums_2[9] !== null) throw new Error("r0.shifted_nums_2 failed");
    if (r0.shifted_nums_neg_1[0] !== 1 || r0.shifted_nums_neg_1[9] !== null) throw new Error("r0.shifted_nums_neg_1 failed");
    if (Math.abs(r0.variance_nums - 6.75) > 1e-6) throw new Error(`Expected r0.variance_nums to be 6.75, got ${r0.variance_nums}`);
    if (Math.abs(r0.std_nums - Math.sqrt(6.75)) > 1e-6) throw new Error(`Expected r0.std_nums to match, got ${r0.std_nums}`);
    if (r0.spliced_nums[0] !== 3 || r0.spliced_nums[1] !== 99 || r0.spliced_nums[2] !== 100 || r0.spliced_nums[3] !== 1) throw new Error("r0.spliced_nums failed");
    if (r0.dropped_nulls_nums.length !== 9 || r0.dropped_nulls_nums.includes(null)) throw new Error("r0.dropped_nulls_nums failed");
    if (r0.filtered_nums.length !== 4 || r0.filtered_nums[0] !== 5 || r0.filtered_nums[1] !== 9 || r0.filtered_nums[2] !== 6 || r0.filtered_nums[3] !== 5) throw new Error("r0.filtered_nums failed");

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

    // nulls first sort checks
    const expectedSortNullsFirst = [null, 1, 1, 2, 3, 4, 5, 5, 6, 9];
    for (let i = 0; i < expectedSortNullsFirst.length; i++) {
        if (r0.sorted_nums_nulls_first[i] !== expectedSortNullsFirst[i]) {
            throw new Error(`Expected sorted_nums_nulls_first[${i}] to be ${expectedSortNullsFirst[i]}, got ${r0.sorted_nums_nulls_first[i]}`);
        }
    }
    const expectedSortDescNullsFirst = [null, 9, 6, 5, 5, 4, 3, 2, 1, 1];
    for (let i = 0; i < expectedSortDescNullsFirst.length; i++) {
        if (r0.sorted_nums_desc_nulls_first[i] !== expectedSortDescNullsFirst[i]) {
            throw new Error(`Expected sorted_nums_desc_nulls_first[${i}] to be ${expectedSortDescNullsFirst[i]}, got ${r0.sorted_nums_desc_nulls_first[i]}`);
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
    if (r0.every_2_neg_offset.length !== 1 || r0.every_2_neg_offset[0] !== 5) throw new Error("r0.every_2_neg_offset failed");
    if (r0.every_neg_2_neg_offset.length !== 5 || r0.every_neg_2_neg_offset[0] !== 5 || r0.every_neg_2_neg_offset[1] !== null || r0.every_neg_2_neg_offset[2] !== 9 || r0.every_neg_2_neg_offset[3] !== 1 || r0.every_neg_2_neg_offset[4] !== 1) throw new Error("r0.every_neg_2_neg_offset failed");
    if (r0.every_pos_2_neg_offset.length !== 2 || r0.every_pos_2_neg_offset[0] !== 2 || r0.every_pos_2_neg_offset[1] !== 6) throw new Error("r0.every_pos_2_neg_offset failed");
    if (r0.every_neg_2_offset_4.length !== 3 || r0.every_neg_2_offset_4[0] !== 5 || r0.every_neg_2_offset_4[1] !== 4 || r0.every_neg_2_offset_4[2] !== 3) throw new Error("r0.every_neg_2_offset_4 failed");
    if (r0.every_pos_step_start_end.length !== 3 || r0.every_pos_step_start_end[0] !== 1 || r0.every_pos_step_start_end[1] !== 1 || r0.every_pos_step_start_end[2] !== 9) throw new Error("r0.every_pos_step_start_end failed");
    if (r0.every_neg_step_start_end.length !== 3 || r0.every_neg_step_start_end[0] !== null || r0.every_neg_step_start_end[1] !== 9 || r0.every_neg_step_start_end[2] !== 1) throw new Error("r0.every_neg_step_start_end failed");
    if (r0.every_pos_step_neg_start_end.length !== 3 || r0.every_pos_step_neg_start_end[0] !== 1 || r0.every_pos_step_neg_start_end[1] !== 1 || r0.every_pos_step_neg_start_end[2] !== 9) throw new Error("r0.every_pos_step_neg_start_end failed");
    if (r0.every_neg_step_neg_start_end.length !== 3 || r0.every_neg_step_neg_start_end[0] !== null || r0.every_neg_step_neg_start_end[1] !== 9 || r0.every_neg_step_neg_start_end[2] !== 1) throw new Error("r0.every_neg_step_neg_start_end failed");
    if (r0.every_2_limit_3.length !== 3 || r0.every_2_limit_3[0] !== 3 || r0.every_2_limit_3[1] !== 4 || r0.every_2_limit_3[2] !== 5) throw new Error("r0.every_2_limit_3 failed");


    // Robustness assertions Row 0
    if (r0.typed_len !== 3) throw new Error(`Expected r0.typed_len 3, got ${r0.typed_len}`);
    if (r0.typed_sum !== 60) throw new Error(`Expected r0.typed_sum 60, got ${r0.typed_sum}`);
    if (r0.coerced_sum !== 8) throw new Error(`Expected r0.coerced_sum 8, got ${r0.coerced_sum}`);
    if (Math.abs(r0.coerced_mean - 8 / 3) > 1e-6) throw new Error(`Expected r0.coerced_mean 2.6666, got ${r0.coerced_mean}`);
    if (r0.gather_typed_indices[0] !== 3 || r0.gather_typed_indices[1] !== 4 || r0.gather_typed_indices[2] !== 6) {
        throw new Error(`Expected gather_typed_indices [3, 4, 6], got ${JSON.stringify(r0.gather_typed_indices)}`);
    }
    if (r0.typed_contains_all !== true) throw new Error(`Expected r0.typed_contains_all true, got ${r0.typed_contains_all}`);
    if (r0.typed_contains_any !== true) throw new Error(`Expected r0.typed_contains_any true, got ${r0.typed_contains_any}`);

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
    if (r1.gather_typed_indices[0] !== 10 || r1.gather_typed_indices[1] !== 20 || r1.gather_typed_indices[2] !== 20) {
        throw new Error(`Expected gather_typed_indices [10, 20, 20], got ${JSON.stringify(r1.gather_typed_indices)}`);
    }
    if (r1.typed_contains_all !== false) throw new Error(`Expected r1.typed_contains_all false, got ${r1.typed_contains_all}`);
    if (r1.typed_contains_any !== false) throw new Error(`Expected r1.typed_contains_any false, got ${r1.typed_contains_any}`);
    if (r1.max_index_nums !== 2) throw new Error(`Expected r1.max_index_nums 2, got ${r1.max_index_nums}`);
    if (r1.min_index_nums !== 1) throw new Error(`Expected r1.min_index_nums 1, got ${r1.min_index_nums}`);
    if (r1.shifted_nums_2[2] !== 10 || r1.shifted_nums_2[0] !== null || r1.shifted_nums_2[3] !== -5) throw new Error("r1.shifted_nums_2 failed");
    if (r1.shifted_nums_neg_1[0] !== -5 || r1.shifted_nums_neg_1[3] !== null) throw new Error("r1.shifted_nums_neg_1 failed");
    if (Math.abs(r1.variance_nums - 122.916667) > 1e-4) throw new Error(`Expected r1.variance_nums to be 122.916667, got ${r1.variance_nums}`);
    if (Math.abs(r1.std_nums - Math.sqrt(122.916667)) > 1e-6) throw new Error(`Expected r1.std_nums to match, got ${r1.std_nums}`);
    if (r1.spliced_nums[0] !== 10 || r1.spliced_nums[1] !== 99 || r1.spliced_nums[2] !== 100 || r1.spliced_nums[3] !== 0) throw new Error("r1.spliced_nums failed");
    if (r1.dropped_nulls_nums.length !== 4) throw new Error("r1.dropped_nulls_nums failed");
    if (r1.filtered_nums.length !== 2 || r1.filtered_nums[0] !== 10 || r1.filtered_nums[1] !== 20) throw new Error("r1.filtered_nums failed");

    // Test null_on_oob = false throws
    let threwOob = false;
    try {
        df.select([
            $df.col("numbers").arr.get(100, false)
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
            $df.col("numbers").arr.gather([0, 100], false)
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

    // ----------------------------------------------------
    // START COMPLEX ELEMENT OPERATIONS TESTS
    // ----------------------------------------------------
    console.log("Starting complex element operations tests...");

    const complexData = [
        {
            id: 1,
            tags: ["apple", "banana", null],
            numbers: [1, 2, 3, 4, 5],
            dates: ["2026-05-20", "2026-05-21", "2026-05-22"],
            nested: [[1, 2], [3, 4], null, [5]]
        },
        {
            id: 2,
            tags: ["peach", null, "cherry", "pear"],
            numbers: [10, 20, 30],
            dates: ["2026-05-24", "2026-05-25"],
            nested: [[6], [], [7, 8, 9]]
        }
    ];

    const complexDf = $df.data(complexData);

    const projectedComplex = complexDf.select([
        // Arithmetic & Math
        $df.col("numbers").arr.filter($df.element().mod(2).ne(0)).alias("odd_numbers"),
        $df.col("numbers").arr.filter($df.element().pow(2).gt(15)).alias("pow_numbers"),

        // String Exprs on Element
        $df.col("tags").arr.filter($df.element().is_not_null().and($df.element().str.starts_with("a"))).alias("a_tags"),
        $df.col("tags").arr.eval($df.when($df.element().is_null()).then("N/A").otherwise($df.element().str.to_uppercase())).alias("upper_tags"),

        // Date Exprs on Element
        $df.col("dates").arr.eval($df.element().str.to_datetime().dt.day()).alias("date_days"),

        // Conditional expression logic on elements
        $df.col("numbers").arr.eval(
            $df.when($df.element().gt(3))
               .then($df.element().mul(10))
               .otherwise($df.element().add(100))
        ).alias("conditional_numbers"),

        // Nested lists
        $df.col("nested").arr.eval($df.element().arr.sum()).alias("nested_sums"),
        $df.col("nested").arr.eval($df.element().arr.filter($df.element().gt(2))).alias("nested_filtered"),

        // Scalar broadcasts
        $df.col("numbers").arr.filter($df.lit(true)).alias("broadcast_true"),
        $df.col("numbers").arr.filter($df.lit(false)).alias("broadcast_false"),

        // to_struct operations with upper_bound and fields sequences
        $df.col("tags").arr.to_struct({ fields: ["t1", "t2"] }).alias("tags_struct_fields"),
        $df.col("tags").arr.to_struct().alias("tags_struct_default"),
        $df.col("tags").arr.to_struct({ upper_bound: 4 }).alias("tags_struct_upper_bound"),
        $df.col("tags").arr.to_struct({ upper_bound: 4, fields: (idx) => `idx_${idx}` }).alias("tags_struct_upper_bound_custom_fn")
    ]).to_dicts() as any[];

    console.log("Complex element projection results:");
    console.dir(projectedComplex, { depth: null });

    const cx0 = projectedComplex[0];
    const cx1 = projectedComplex[1];

    // Assert odd_numbers: odd numbers kept
    if (JSON.stringify(cx0.odd_numbers) !== JSON.stringify([1, 3, 5])) throw new Error("odd_numbers cx0 failed");
    if (JSON.stringify(cx1.odd_numbers) !== JSON.stringify([])) throw new Error("odd_numbers cx1 failed");

    // Assert pow_numbers: values whose square is > 15
    if (JSON.stringify(cx0.pow_numbers) !== JSON.stringify([4, 5])) throw new Error("pow_numbers cx0 failed");
    if (JSON.stringify(cx1.pow_numbers) !== JSON.stringify([10, 20, 30])) throw new Error("pow_numbers cx1 failed");

    // Assert a_tags: tags that start with 'a' and are not null
    if (JSON.stringify(cx0.a_tags) !== JSON.stringify(["apple"])) throw new Error("a_tags cx0 failed");
    if (JSON.stringify(cx1.a_tags) !== JSON.stringify([])) throw new Error("a_tags cx1 failed");

    // Assert upper_tags: conditional N/A string and uppercase
    if (JSON.stringify(cx0.upper_tags) !== JSON.stringify(["APPLE", "BANANA", "N/A"])) throw new Error("upper_tags cx0 failed");
    if (JSON.stringify(cx1.upper_tags) !== JSON.stringify(["PEACH", "N/A", "CHERRY", "PEAR"])) throw new Error("upper_tags cx1 failed");

    // Assert date_days: day component extracted from dates
    if (JSON.stringify(cx0.date_days) !== JSON.stringify([20, 21, 22])) throw new Error("date_days cx0 failed");
    if (JSON.stringify(cx1.date_days) !== JSON.stringify([24, 25])) throw new Error("date_days cx1 failed");

    // Assert conditional_numbers: if element > 3 multiply by 10, else add 100
    if (JSON.stringify(cx0.conditional_numbers) !== JSON.stringify([101, 102, 103, 40, 50])) throw new Error("conditional_numbers cx0 failed");
    if (JSON.stringify(cx1.conditional_numbers) !== JSON.stringify([100, 200, 300])) throw new Error("conditional_numbers cx1 failed");

    // Assert nested_sums: sub-array elements summed
    if (JSON.stringify(cx0.nested_sums) !== JSON.stringify([3, 7, null, 5])) throw new Error("nested_sums cx0 failed");
    if (JSON.stringify(cx1.nested_sums) !== JSON.stringify([6, null, 24])) throw new Error("nested_sums cx1 failed");

    // Assert nested_filtered: sub-array elements filtered to keep values > 2
    if (JSON.stringify(cx0.nested_filtered) !== JSON.stringify([[], [3, 4], null, [5]])) throw new Error("nested_filtered cx0 failed");
    if (JSON.stringify(cx1.nested_filtered) !== JSON.stringify([[6], [], [7, 8, 9]])) throw new Error("nested_filtered cx1 failed");

    // Assert scalar broadcasts
    if (JSON.stringify(cx0.broadcast_true) !== JSON.stringify([1, 2, 3, 4, 5])) throw new Error("broadcast_true cx0 failed");
    if (JSON.stringify(cx1.broadcast_true) !== JSON.stringify([10, 20, 30])) throw new Error("broadcast_true cx1 failed");
    if (JSON.stringify(cx0.broadcast_false) !== JSON.stringify([])) throw new Error("broadcast_false cx0 failed");
    if (JSON.stringify(cx1.broadcast_false) !== JSON.stringify([])) throw new Error("broadcast_false cx1 failed");

    // Assert to_struct strategy outputs
    if (JSON.stringify(cx0.tags_struct_fields) !== JSON.stringify({ t1: "apple", t2: "banana" })) throw new Error("tags_struct_fields cx0 failed");
    if (JSON.stringify(cx1.tags_struct_fields) !== JSON.stringify({ t1: "peach", t2: null })) throw new Error("tags_struct_fields cx1 failed");

    // tags_struct_default now uses max_width fallback, matching upper_bound=4
    if (JSON.stringify(cx0.tags_struct_default) !== JSON.stringify({ field_0: "apple", field_1: "banana", field_2: null, field_3: null })) throw new Error("tags_struct_default cx0 failed");
    if (JSON.stringify(cx1.tags_struct_default) !== JSON.stringify({ field_0: "peach", field_1: null, field_2: "cherry", field_3: "pear" })) throw new Error("tags_struct_default cx1 failed");

    if (JSON.stringify(cx0.tags_struct_upper_bound) !== JSON.stringify({ field_0: "apple", field_1: "banana", field_2: null, field_3: null })) throw new Error("tags_struct_upper_bound cx0 failed");
    if (JSON.stringify(cx1.tags_struct_upper_bound) !== JSON.stringify({ field_0: "peach", field_1: null, field_2: "cherry", field_3: "pear" })) throw new Error("tags_struct_upper_bound cx1 failed");

    if (JSON.stringify(cx0.tags_struct_upper_bound_custom_fn) !== JSON.stringify({ idx_0: "apple", idx_1: "banana", idx_2: null, idx_3: null })) throw new Error("tags_struct_upper_bound_custom_fn cx0 failed");
    if (JSON.stringify(cx1.tags_struct_upper_bound_custom_fn) !== JSON.stringify({ idx_0: "peach", idx_1: null, idx_2: "cherry", idx_3: "pear" })) throw new Error("tags_struct_upper_bound_custom_fn cx1 failed");

    // Test zero-width error guard
    let threwZeroWidth = false;
    try {
        complexDf.select([
            $df.col("tags").arr.to_struct({ upper_bound: 0 })
        ]).to_dicts();
    } catch (e: any) {
        if (e.message && e.message.includes("width is 0")) {
            threwZeroWidth = true;
        }
    }
    if (!threwZeroWidth) {
        throw new Error("Expected zero width to_struct to throw an error");
    }
    console.log("✓ to_struct width === 0 error guard passed");

    console.log("✓ Complex element operations tests passed successfully!");
    // ----------------------------------------------------
    // END COMPLEX ELEMENT OPERATIONS TESTS
    // ----------------------------------------------------

    console.log("\n🎉 ALL Expr.arr COLUMN EXPRESSION TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Expr.arr COLUMN EXPRESSION TESTS FAILED:", err);
    process.exit(1);
}
