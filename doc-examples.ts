/**
 * Canonical sample datasets and ASCII table renderings for JSDoc documentation.
 * @internal
 * @internalfile
 */

export const DOC_EXAMPLES: Record<string, string> = {
    // 1. Basic 2-column DataFrame (2 rows) - { a: [1, 2], b: ["x", "y"] }
    base_2x2: [
        '>>> const df = $df.data({ a: [1, 2], b: ["x", "y"] })',
        '>>> df',
        'shape: (2, 2)',
        '+---+---+',
        '| a | b |',
        '+---+---+',
        '| 1 | x |',
        '| 2 | y |',
        '+---+---+'
    ].join('\n'),

    // 2. Single-column 3-row numeric DataFrame - { a: [1, 2, 3] }
    base_numbers_3x1: [
        '>>> const df = $df.data({ a: [1, 2, 3] })',
        '>>> df',
        'shape: (3, 1)',
        '+---+',
        '| a |',
        '+---+',
        '| 1 |',
        '| 2 |',
        '| 3 |',
        '+---+'
    ].join('\n'),

    // 3. Basic 3-row numeric DataFrame - { a: [1, 2, 3], b: [10, 20, 30] }
    base_numbers_3x2: [
        '>>> const df = $df.data({ a: [1, 2, 3], b: [10, 20, 30] })',
        '>>> df',
        'shape: (3, 2)',
        '+---+----+',
        '| a | b  |',
        '+---+----+',
        '| 1 | 10 |',
        '| 2 | 20 |',
        '| 3 | 30 |',
        '+---+----+'
    ].join('\n'),

    // 4. Categorical / Grouping 3-row DataFrame - { group: ["A", "A", "B"], val: [10, 20, 30] }
    base_grouped_3x2: [
        '>>> const df = $df.data({ group: ["A", "A", "B"], val: [10, 20, 30] })',
        '>>> df',
        'shape: (3, 2)',
        '+-------+-----+',
        '| group | val |',
        '+-------+-----+',
        '| A     | 10  |',
        '| A     | 20  |',
        '| B     | 30  |',
        '+-------+-----+'
    ].join('\n'),

    // 5. Nullable 3-row 2-column DataFrame - { a: [1, null, 3], b: [null, 2, null] }
    base_nulls_3x2: [
        '>>> const df = $df.data({ a: [1, null, 3], b: [null, 2, null] })',
        '>>> df',
        'shape: (3, 2)',
        '+------+------+',
        '| a    | b    |',
        '+------+------+',
        '| 1    | null |',
        '| null | 2    |',
        '| 3    | null |',
        '+------+------+'
    ].join('\n'),

    // 6. 4-row 2-column Boolean DataFrame - { a: [true, true, false, false], b: [true, false, true, false] }
    base_bool_4x2: [
        '>>> const df = $df.data({ a: [true, true, false, false], b: [true, false, true, false] })',
        '>>> df',
        'shape: (4, 2)',
        '+-------+-------+',
        '| a     | b     |',
        '+-------+-------+',
        '| true  | true  |',
        '| true  | false |',
        '| false | true  |',
        '| false | false |',
        '+-------+-------+'
    ].join('\n'),

    // 7. String 3-row list - { s: ["apple", "banana", "cherry"] }
    base_strings_3x1: [
        '>>> const df = $df.data({ s: ["apple", "banana", "cherry"] })',
        '>>> df',
        'shape: (3, 1)',
        '+----------+',
        '| s        |',
        '+----------+',
        '| "apple"  |',
        '| "banana" |',
        '| "cherry" |',
        '+----------+'
    ].join('\n'),

    // 8. Array 2-row nested numeric DataFrame - { a: [[1, 2, 3], [4, 5]] }
    base_array_nested_2rows: [
        '>>> const df = $df.data({ a: [[1, 2, 3], [4, 5]] })',
        '>>> df',
        'shape: (2, 1)',
        '+-----------+',
        '| a         |',
        '+-----------+',
        '| [1, 2, 3] |',
        '| [4, 5]    |',
        '+-----------+'
    ].join('\n'),

    // 9. Struct single user row - { user: [{ name: "Alice", age: 30 }] }
    base_struct_single: [
        '>>> const df = $df.data({ user: [{ name: "Alice", age: 30 }] })',
        '>>> df',
        'shape: (1, 1)',
        '+--------------------------------+',
        '| user                           |',
        '+--------------------------------+',
        '| { name: "Alice", age: 30 }     |',
        '+--------------------------------+'
    ].join('\n'),

    // 10. Temporal single Datetime row - { date: ["2026-05-20T10:00:00.123Z"] }
    base_temporal_single: [
        '>>> const df = $df.data({ date: ["2026-05-20T10:00:00.123Z"] })',
        '>>> df',
        'shape: (1, 1)',
        '+--------------------------+',
        '| date                     |',
        '+--------------------------+',
        '| 2026-05-20T10:00:00.123Z |',
        '+--------------------------+'
    ].join('\n'),

    // 11. Two single-column DataFrames for Concat / HConcat / VConcat
    base_concat_pair: [
        '>>> const df1 = $df.data({ a: [1, 2] })',
        '>>> const df2 = $df.data({ b: [10, 20] })',
        '>>> df1',
        'shape: (2, 1)',
        '+---+',
        '| a |',
        '+---+',
        '| 1 |',
        '| 2 |',
        '+---+',
        '>>> df2',
        'shape: (2, 1)',
        '+----+',
        '| b  |',
        '+----+',
        '| 10 |',
        '| 20 |',
        '+----+'
    ].join('\n'),

    // 12. Two DataFrames for Join operations
    base_join_pair: [
        '>>> const df1 = $df.data({ id: [1, 2], val: ["a", "b"] })',
        '>>> const df2 = $df.data({ id: [1, 2], num: [100, 200] })',
        '>>> df1',
        'shape: (2, 2)',
        '+----+-----+',
        '| id | val |',
        '+----+-----+',
        '| 1  | a   |',
        '| 2  | b   |',
        '+----+-----+',
        '>>> df2',
        'shape: (2, 2)',
        '+----+-----+',
        '| id | num |',
        '+----+-----+',
        '| 1  | 100 |',
        '| 2  | 200 |',
        '+----+-----+'
    ].join('\n'),

    // 13. Pair of DataFrames for Asof Join (trades & quotes)
    base_asof_pair: [
        '>>> const trades = $df.data([',
        '...   { time: 1000, ticker: "AAPL", price: 150.0 },',
        '...   { time: 1005, ticker: "AAPL", price: 150.5 },',
        '...   { time: 1015, ticker: "AAPL", price: 151.0 }',
        '... ])',
        '>>> const quotes = $df.data([',
        '...   { time: 998, ticker: "AAPL", bid: 149.9 },',
        '...   { time: 1004, ticker: "AAPL", bid: 150.4 },',
        '...   { time: 1010, ticker: "AAPL", bid: 150.8 }',
        '... ])',
        '>>> trades',
        'shape: (3, 3)',
        '+------+--------+-------+',
        '| time | ticker | price |',
        '+------+--------+-------+',
        '| 1000 | AAPL   | 150.0 |',
        '| 1005 | AAPL   | 150.5 |',
        '| 1015 | AAPL   | 151.0 |',
        '+------+--------+-------+',
        '>>> quotes',
        'shape: (3, 3)',
        '+------+--------+-------+',
        '| time | ticker | bid   |',
        '+------+--------+-------+',
        '| 998  | AAPL   | 149.9 |',
        '| 1004 | AAPL   | 150.4 |',
        '| 1010 | AAPL   | 150.8 |',
        '+------+--------+-------+'
    ].join('\n'),

    // 14. Wide DataFrame for Pivot / Unpivot / Transpose
    base_pivot_table: [
        '>>> const df = $df.data({ year: [2020, 2020, 2021, 2021], month: ["Jan", "Feb", "Jan", "Feb"], revenue: [100, 150, 120, 180] })',
        '>>> df',
        'shape: (4, 3)',
        '+------+-------+---------+',
        '| year | month | revenue |',
        '+------+-------+---------+',
        '| 2020 | Jan   | 100     |',
        '| 2020 | Feb   | 150     |',
        '| 2021 | Jan   | 120     |',
        '| 2021 | Feb   | 180     |',
        '+------+-------+---------+'
    ].join('\n'),

    // 15. Time-Series DataFrame for Dynamic Grouping
    base_dataframe_dynamic: [
        '>>> const df = $df.data([',
        '...   { time: new Date("2024-01-01T00:00:00Z"), val: 10 },',
        '...   { time: new Date("2024-01-01T12:00:00Z"), val: 20 },',
        '...   { time: new Date("2024-01-02T00:00:00Z"), val: 30 }',
        '... ])',
        '>>> df',
        'shape: (3, 2)',
        '+--------------------------+-----+',
        '| time                     | val |',
        '+--------------------------+-----+',
        '| 2024-01-01T00:00:00.000Z | 10  |',
        '| 2024-01-01T12:00:00.000Z | 20  |',
        '| 2024-01-02T00:00:00.000Z | 30  |',
        '+--------------------------+-----+'
    ].join('\n'),

    // 16. Two DataFrames for JoinWhere operations
    base_join_where_pair: [
        '>>> const east = $df.data([',
        '...   { id: 100, dur: 120, rev: 12, cores: 2 },',
        '...   { id: 101, dur: 140, rev: 14, cores: 8 },',
        '...   { id: 102, dur: 160, rev: 16, cores: 4 }',
        '... ])',
        '>>> const west = $df.data([',
        '...   { t_id: 404, time: 90, cost: 9, cores: 4 },',
        '...   { t_id: 498, time: 130, cost: 13, cores: 2 },',
        '...   { t_id: 676, time: 150, cost: 15, cores: 1 },',
        '...   { t_id: 742, time: 170, cost: 16, cores: 4 }',
        '... ])',
        '>>> east',
        'shape: (3, 4)',
        '+-----+-----+-----+-------+',
        '| id  | dur | rev | cores |',
        '+-----+-----+-----+-------+',
        '| 100 | 120 | 12  | 2     |',
        '| 101 | 140 | 14  | 8     |',
        '| 102 | 160 | 16  | 4     |',
        '+-----+-----+-----+-------+',
        '>>> west',
        'shape: (4, 4)',
        '+------+------+------+-------+',
        '| t_id | time | cost | cores |',
        '+------+------+------+-------+',
        '| 404  | 90   | 9    | 4     |',
        '| 498  | 130  | 13   | 2     |',
        '| 676  | 150  | 15   | 1     |',
        '| 742  | 170  | 16   | 4     |',
        '+------+------+------+-------+'
    ].join('\n')
};
