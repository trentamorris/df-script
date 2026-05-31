declare const process: any;
import { $tbl } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION STR NAMESPACE TESTS...");
console.log("=========================================");

const data = [
    {
        name: "  --Alice  ",
        phrase: "FrameScript is awesome!",
        prefix_suffix: "pre-middle-suf",
        digits: "42"
    },
    {
        name: "Bob--  ",
        phrase: "Hello world!",
        prefix_suffix: "no-prefix-suf",
        digits: "7"
    }
];

const schema = {
    name: $tbl.DataType.Utf8,
    phrase: $tbl.DataType.Utf8,
    prefix_suffix: $tbl.DataType.Utf8,
    digits: $tbl.DataType.Utf8
};

try {
    const df = $tbl.data(data, schema);

    const projected = df.select([
        // Basic conversions
        $tbl.col("phrase").str.to_lowercase().alias("lower"),
        $tbl.col("phrase").str.to_uppercase().alias("upper"),
        $tbl.col("phrase").str.to_titlecase().alias("title"),
        $tbl.col("phrase").str.reverse().alias("reversed"),

        // Lengths
        $tbl.col("phrase").str.len_chars().alias("len_c"),
        $tbl.col("phrase").str.len_bytes().alias("len_b"),

        // Padding & Zfill
        $tbl.col("digits").str.zfill(4).alias("zfilled"),
        $tbl.col("digits").str.pad_start(5, "*").alias("padded_start"),
        $tbl.col("digits").str.pad_end(5, "-").alias("padded_end"),

        // Slice & Split & Explode
        $tbl.col("phrase").str.slice(0, 11).alias("sliced"),
        $tbl.col("phrase").str.slice(-8, 7).alias("sliced_neg"),
        $tbl.col("phrase").str.split(" ").alias("split_arr"),
        $tbl.col("digits").str.explode().alias("exploded_arr"),

        // Stripping
        $tbl.col("name").str.strip_chars().alias("stripped_ws"),
        $tbl.col("name").str.strip_chars(" -").alias("stripped_chars"),
        $tbl.col("name").str.strip_chars_start(undefined).alias("stripped_start_ws"),
        $tbl.col("name").str.strip_chars_end().alias("stripped_end_ws"),
        $tbl.col("name").str.strip_chars("-", { trimFirst: true }).alias("stripped_chars_trim_first"),
        $tbl.col("name").str.strip_chars("-", { maxScanStart: 3, maxScanEnd: 3 }).alias("stripped_chars_offset_3"),
        $tbl.col("name").str.strip_chars(/[a-zA-Z]/, { maxScanStart: 10, maxScanEnd: 10 }).alias("stripped_chars_regex"),
        $tbl.col("digits").str.strip_chars(/[0-9]/, { returnStringOnNull: true }).alias("stripped_digits_regex"),

        // Prefix/Suffix removal
        $tbl.col("prefix_suffix").str.strip_prefix("pre-").alias("stripped_prefix"),
        $tbl.col("prefix_suffix").str.strip_suffix("-suf").alias("stripped_suffix"),

        // Regex / Matches
        $tbl.col("phrase").str.contains("awesome").alias("contains_str"),
        $tbl.col("phrase").str.contains(/is/i).alias("contains_regex"),
        $tbl.col("phrase").str.ends_with("!").alias("ends_with_excl"),
        $tbl.col("phrase").str.starts_with("Frame").alias("starts_with_frame"),
        $tbl.col("phrase").str.replace("is", "was").alias("replaced"),
        $tbl.col("phrase").str.replace_all("e", "3").alias("replaced_all")
    ]).collect() as any[];

    console.log("Coerced Expr.str results:");
    console.dir(projected, { depth: null });

    const r0 = projected[0];
    if (r0.lower !== "framescript is awesome!") throw new Error(`Expected r0.lower to be "framescript is awesome!", got ${r0.lower}`);
    if (r0.upper !== "FRAMESCRIPT IS AWESOME!") throw new Error(`Expected r0.upper to be "FRAMESCRIPT IS AWESOME!", got ${r0.upper}`);
    if (r0.title !== "FrameScript Is Awesome!") throw new Error(`Expected r0.title to be "FrameScript Is Awesome!", got ${r0.title}`);
    if (r0.reversed !== "!emosewa si tpircSemarF") throw new Error(`Expected r0.reversed to be "!emosewa si tpircSemarF", got ${r0.reversed}`);

    if (r0.len_c !== 23) throw new Error(`Expected r0.len_c to be 23, got ${r0.len_c}`);
    if (r0.len_b !== 23) throw new Error(`Expected r0.len_b to be 23, got ${r0.len_b}`);

    if (r0.zfilled !== "0042") throw new Error(`Expected r0.zfilled to be "0042", got ${r0.zfilled}`);
    if (r0.padded_start !== "***42") throw new Error(`Expected r0.padded_start to be "***42", got ${r0.padded_start}`);
    if (r0.padded_end !== "42---") throw new Error(`Expected r0.padded_end to be "42---", got ${r0.padded_end}`);

    if (r0.sliced !== "FrameScript") throw new Error(`Expected r0.sliced to be "FrameScript", got ${r0.sliced}`);
    if (r0.sliced_neg !== "awesome") throw new Error(`Expected r0.sliced_neg to be "awesome", got ${r0.sliced_neg}`); // "-8" is "awesome!", length 7 is "awesome"
    if (JSON.stringify(r0.split_arr) !== JSON.stringify(["FrameScript", "is", "awesome!"])) {
        throw new Error(`Expected r0.split_arr to be ["FrameScript", "is", "awesome!"], got ${JSON.stringify(r0.split_arr)}`);
    }
    if (JSON.stringify(r0.exploded_arr) !== JSON.stringify(["4", "2"])) {
        throw new Error(`Expected r0.exploded_arr to be ["4", "2"], got ${JSON.stringify(r0.exploded_arr)}`);
    }

    if (r0.stripped_ws !== "--Alice") throw new Error(`Expected r0.stripped_ws to be "--Alice", got ${r0.stripped_ws}`);
    if (r0.stripped_chars !== "Alice") throw new Error(`Expected r0.stripped_chars to be "Alice", got ${r0.stripped_chars}`);
    if (r0.stripped_start_ws !== "--Alice  ") throw new Error(`Expected r0.stripped_start_ws to be "--Alice  ", got ${r0.stripped_start_ws}`);
    if (r0.stripped_end_ws !== "  --Alice") throw new Error(`Expected r0.stripped_end_ws to be "  --Alice", got ${r0.stripped_end_ws}`);
    if (r0.stripped_chars_trim_first !== "Alice") throw new Error(`Expected r0.stripped_chars_trim_first to be "Alice", got "${r0.stripped_chars_trim_first}"`);
    if (r0.stripped_chars_offset_3 !== "  Alice  ") throw new Error(`Expected r0.stripped_chars_offset_3 to be "  Alice  ", got "${r0.stripped_chars_offset_3}"`);
    if (r0.stripped_chars_regex !== "  --  ") throw new Error(`Expected r0.stripped_chars_regex to be "  --  ", got "${r0.stripped_chars_regex}"`);
    if (r0.stripped_digits_regex !== "") throw new Error(`Expected r0.stripped_digits_regex to be "", got "${r0.stripped_digits_regex}"`);

    if (r0.stripped_prefix !== "middle-suf") throw new Error(`Expected r0.stripped_prefix to be "middle-suf", got ${r0.stripped_prefix}`);
    if (r0.stripped_suffix !== "pre-middle") throw new Error(`Expected r0.stripped_suffix to be "pre-middle", got ${r0.stripped_suffix}`);

    if (r0.contains_str !== true) throw new Error(`Expected r0.contains_str to be true, got ${r0.contains_str}`);
    if (r0.contains_regex !== true) throw new Error(`Expected r0.contains_regex to be true, got ${r0.contains_regex}`);
    if (r0.ends_with_excl !== true) throw new Error(`Expected r0.ends_with_excl to be true, got ${r0.ends_with_excl}`);
    if (r0.starts_with_frame !== true) throw new Error(`Expected r0.starts_with_frame to be true, got ${r0.starts_with_frame}`);
    if (r0.replaced !== "FrameScript was awesome!") throw new Error(`Expected r0.replaced to be "FrameScript was awesome!", got ${r0.replaced}`);
    if (r0.replaced_all !== "Fram3Script is aw3som3!") throw new Error(`Expected r0.replaced_all to be "Fram3Script is aw3som3!", got ${r0.replaced_all}`);

    // Assert Row 1
    const r1 = projected[1];
    if (r1.stripped_prefix !== "no-prefix-suf") throw new Error(`Expected r1.stripped_prefix to be "no-prefix-suf", got ${r1.stripped_prefix}`); // doesn't have prefix "pre-"
    if (r1.stripped_suffix !== "no-prefix") throw new Error(`Expected r1.stripped_suffix to be "no-prefix", got ${r1.stripped_suffix}`);
    if (r1.stripped_chars_trim_first !== "Bob") throw new Error(`Expected r1.stripped_chars_trim_first to be "Bob", got "${r1.stripped_chars_trim_first}"`);
    if (r1.stripped_chars_offset_3 !== "Bob  ") throw new Error(`Expected r1.stripped_chars_offset_3 to be "Bob  ", got "${r1.stripped_chars_offset_3}"`);
    if (r1.stripped_chars_regex !== "--  ") throw new Error(`Expected r1.stripped_chars_regex to be "--  ", got "${r1.stripped_chars_regex}"`);
    if (r1.stripped_digits_regex !== "") throw new Error(`Expected r1.stripped_digits_regex to be "", got "${r1.stripped_digits_regex}"`);

    console.log("-----------------------------------------");
    console.log("RUNNING CASTING & PARSING TESTS...");
    console.log("-----------------------------------------");

    const castData = [
        {
            date_str: "2026-05-25 14:30:15",
            iso_date: "2026-05-25",
            iso_datetime: "2026-05-25T14:30:15.123Z",
            decimal_str: "123.456",
            int_str: "123",
            time_str: "14:30:15.123",
            upper_str: "HELLO WORLD",
            lower_str: "hello world",
            title_str: "hello world"
        }
    ];

    const castSchema = {
        date_str: $tbl.DataType.Utf8,
        iso_date: $tbl.DataType.Utf8,
        iso_datetime: $tbl.DataType.Utf8,
        decimal_str: $tbl.DataType.Utf8,
        int_str: $tbl.DataType.Utf8,
        time_str: $tbl.DataType.Utf8,
        upper_str: $tbl.DataType.Utf8,
        lower_str: $tbl.DataType.Utf8,
        title_str: $tbl.DataType.Utf8
    };

    const castDf = $tbl.data(castData, castSchema);
    const castProjected = castDf.select([
        $tbl.col("date_str").str.strptime("%Y-%m-%d %H:%M:%S").alias("parsed_datetime"),
        $tbl.col("iso_date").str.to_date().alias("parsed_date"),
        $tbl.col("iso_datetime").str.to_datetime().alias("parsed_iso_datetime"),
        $tbl.col("decimal_str").str.to_decimal(10, 2).alias("parsed_decimal"),
        $tbl.col("int_str").str.to_integer().alias("parsed_int"),
        $tbl.col("time_str").str.to_time().alias("parsed_time"),
        $tbl.col("upper_str").str.to_lowercase().alias("to_lower"),
        $tbl.col("lower_str").str.to_uppercase().alias("to_upper"),
        $tbl.col("title_str").str.to_titlecase().alias("to_title")
    ]).collect() as any[];

    console.log("Casting and parsing results:");
    console.dir(castProjected, { depth: null });

    const c0 = castProjected[0];
    
    // Assert parsed_datetime
    if (!(c0.parsed_datetime instanceof Date)) throw new Error("Expected parsed_datetime to be Date");
    if (c0.parsed_datetime.toISOString() !== "2026-05-25T14:30:15.000Z") {
        throw new Error(`Expected parsed_datetime to be 2026-05-25T14:30:15.000Z, got ${c0.parsed_datetime.toISOString()}`);
    }

    // Assert parsed_date
    if (!(c0.parsed_date instanceof Date)) throw new Error("Expected parsed_date to be Date");
    if (c0.parsed_date.toISOString() !== "2026-05-25T00:00:00.000Z") {
        throw new Error(`Expected parsed_date to be 2026-05-25T00:00:00.000Z, got ${c0.parsed_date.toISOString()}`);
    }

    // Assert parsed_iso_datetime
    if (!(c0.parsed_iso_datetime instanceof Date)) throw new Error("Expected parsed_iso_datetime to be Date");
    if (c0.parsed_iso_datetime.toISOString() !== "2026-05-25T14:30:15.123Z") {
        throw new Error(`Expected parsed_iso_datetime to be 2026-05-25T14:30:15.123Z, got ${c0.parsed_iso_datetime.toISOString()}`);
    }

    // Assert parsed_decimal
    if (c0.parsed_decimal !== 123.46) {
        throw new Error(`Expected parsed_decimal to be 123.46, got ${c0.parsed_decimal}`);
    }

    // Assert parsed_int
    if (c0.parsed_int !== 123) {
        throw new Error(`Expected parsed_int to be 123, got ${c0.parsed_int}`);
    }

    // Assert parsed_time
    if (c0.parsed_time !== "14:30:15.123") {
        throw new Error(`Expected parsed_time to be "14:30:15.123", got ${c0.parsed_time}`);
    }

    // Assert casings
    if (c0.to_lower !== "hello world") throw new Error(`Expected to_lower to be "hello world", got ${c0.to_lower}`);
    if (c0.to_upper !== "HELLO WORLD") throw new Error(`Expected to_upper to be "HELLO WORLD", got ${c0.to_upper}`);
    if (c0.to_title !== "Hello World") throw new Error(`Expected to_title to be "Hello World", got ${c0.to_title}`);

    console.log("\n🎉 ALL Expr.str COLUMN EXPRESSION & CASTING TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Expr.str COLUMN EXPRESSION TESTS FAILED:", err);
    process.exit(1);
}

