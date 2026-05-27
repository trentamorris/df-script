declare const process: any;
import { $tbl } from "../../index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION LIST NAMESPACE TESTS...");
console.log("=========================================");

const data = [
    {
        id: 1,
        numbers: [3, 1, 4, 1, 5, 9, 2, null, 6, 5],
        tags: ["apple", "banana", "apple", "cherry"],
        not_a_list: 42,
        empty_list: []
    },
    {
        id: 2,
        numbers: [10, -5, 20, 0],
        tags: ["js", "ts"],
        not_a_list: null,
        empty_list: null
    }
];

try {
    const df = $tbl.data(data);
    const projected = df.select([
        // lengths / len
        $tbl.col("numbers").list.lengths().alias("len_nums"),
        $tbl.col("empty_list").list.len().alias("len_empty"),
        $tbl.col("not_a_list").list.len().alias("len_not_list"),

        // max / min / sum / mean
        $tbl.col("numbers").list.max().alias("max_nums"),
        $tbl.col("numbers").list.min().alias("min_nums"),
        $tbl.col("numbers").list.sum().alias("sum_nums"),
        $tbl.col("numbers").list.mean().alias("mean_nums"),

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

        // sort
        $tbl.col("numbers").list.sort().alias("sorted_nums"),
        $tbl.col("numbers").list.sort(true).alias("sorted_nums_desc"),

        // reverse
        $tbl.col("tags").list.reverse().alias("reversed_tags"),

        // unique
        $tbl.col("tags").list.unique().alias("unique_tags"),

        // slice
        $tbl.col("numbers").list.slice(2, 3).alias("slice_nums"),
        $tbl.col("numbers").list.slice(-4, 2).alias("slice_nums_neg"),

        // count_matches
        $tbl.col("tags").list.count_matches("apple").alias("apple_count"),
        $tbl.col("tags").list.count_matches("pear").alias("pear_count")
    ]).collect() as any[];

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

    if (r0.get_idx_2 !== 4) throw new Error(`Expected get_idx_2 4, got ${r0.get_idx_2}`);
    if (r0.get_idx_neg_2 !== 6) throw new Error(`Expected get_idx_neg_2 6, got ${r0.get_idx_neg_2}`);
    if (r0.get_out_of_bounds !== null) throw new Error(`Expected get_out_of_bounds null, got ${r0.get_out_of_bounds}`);
    if (r0.first_tag !== "apple") throw new Error(`Expected first_tag 'apple', got ${r0.first_tag}`);
    if (r0.last_tag !== "cherry") throw new Error(`Expected last_tag 'cherry', got ${r0.last_tag}`);

    if (r0.has_banana !== true) throw new Error(`Expected has_banana true, got ${r0.has_banana}`);
    if (r0.has_orange !== false) throw new Error(`Expected has_orange false, got ${r0.has_orange}`);

    if (r0.joined_tags !== "apple, banana, apple, cherry") throw new Error(`Expected joined_tags, got ${r0.joined_tags}`);

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

    // slice
    if (r0.slice_nums.length !== 3 || r0.slice_nums[0] !== 4 || r0.slice_nums[1] !== 1 || r0.slice_nums[2] !== 5) {
        throw new Error(`Expected slice_nums [4, 1, 5], got ${r0.slice_nums}`);
    }
    // slice_nums_neg is slice from -4 with length 2 => index 6 and 7 -> 2 and null
    if (r0.slice_nums_neg.length !== 2 || r0.slice_nums_neg[0] !== 2 || r0.slice_nums_neg[1] !== null) {
        throw new Error(`Expected slice_nums_neg [2, null], got ${r0.slice_nums_neg}`);
    }

    // count_matches
    if (r0.apple_count !== 2) throw new Error(`Expected apple_count 2, got ${r0.apple_count}`);
    if (r0.pear_count !== 0) throw new Error(`Expected pear_count 0, got ${r0.pear_count}`);

    // Assert Row 1
    const r1 = projected[1];
    if (r1.len_nums !== 4) throw new Error(`Expected len_nums 4, got ${r1.len_nums}`);
    if (r1.len_empty !== null) throw new Error(`Expected len_empty null, got ${r1.len_empty}`);
    if (r1.len_not_list !== null) throw new Error(`Expected len_not_list null, got ${r1.len_not_list}`);

    if (r1.max_nums !== 20) throw new Error(`Expected max_nums 20, got ${r1.max_nums}`);
    if (r1.min_nums !== -5) throw new Error(`Expected min_nums -5, got ${r1.min_nums}`);
    if (r1.sum_nums !== 25) throw new Error(`Expected sum_nums 25, got ${r1.sum_nums}`);
    if (r1.mean_nums !== 6.25) throw new Error(`Expected mean_nums 6.25, got ${r1.mean_nums}`);

    if (r1.get_idx_2 !== 20) throw new Error(`Expected get_idx_2 20, got ${r1.get_idx_2}`);
    if (r1.get_idx_neg_2 !== 20) throw new Error(`Expected get_idx_neg_2 20, got ${r1.get_idx_neg_2}`); // -2 index of [10, -5, 20, 0] is 20
    if (r1.first_tag !== "js") throw new Error(`Expected first_tag 'js', got ${r1.first_tag}`);
    if (r1.last_tag !== "ts") throw new Error(`Expected last_tag 'ts', got ${r1.last_tag}`);

    console.log("\n🎉 ALL Expr.list COLUMN EXPRESSION TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Expr.list COLUMN EXPRESSION TESTS FAILED:", err);
    process.exit(1);
}
