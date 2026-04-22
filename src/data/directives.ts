/*
 * Directive catalog, cross-checked against man 3 strftime (glibc), the Python
 * datetime format-codes table and the Ruby strftime formatting reference.
 * Descriptions and notes live in the i18n messages under "directives.<key>".
 * The %E and %O modifier prefixes are documented in the modifiers card, not
 * listed here.
 */

export type DirectiveCategory =
	| "year"
	| "month"
	| "week"
	| "day"
	| "weekday"
	| "hour"
	| "minute"
	| "second"
	| "timezone"
	| "epoch"
	| "composite"
	| "literal";

export type Dialect = "glibc" | "python" | "ruby";

export interface Directive {
	key: string;
	code: string;
	conversion: string;
	category: DirectiveCategory;
	range?: string;
	glibc: boolean;
	python: boolean;
	ruby: boolean;
}

export const DIALECTS: Dialect[] = ["glibc", "python", "ruby"];

export const CATEGORY_ORDER: DirectiveCategory[] = [
	"year",
	"month",
	"week",
	"day",
	"weekday",
	"hour",
	"minute",
	"second",
	"timezone",
	"epoch",
	"composite",
	"literal",
];

// Swatch token index per category, chosen so neighbors in the palette differ
export const CATEGORY_SWATCH: Record<DirectiveCategory, 1 | 2 | 3 | 4 | 5 | 6> = {
	year: 2,
	month: 3,
	week: 5,
	day: 6,
	weekday: 4,
	hour: 1,
	minute: 2,
	second: 3,
	timezone: 5,
	epoch: 6,
	composite: 4,
	literal: 1,
};

export const DIRECTIVES: Directive[] = [
	{
		key: "Y",
		code: "%Y",
		conversion: "Y",
		category: "year",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "y",
		code: "%y",
		conversion: "y",
		category: "year",
		range: "00..99",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "C",
		code: "%C",
		conversion: "C",
		category: "year",
		range: "00..99",
		glibc: true,
		python: false,
		ruby: true,
	},
	{
		key: "G",
		code: "%G",
		conversion: "G",
		category: "year",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "g",
		code: "%g",
		conversion: "g",
		category: "year",
		range: "00..99",
		glibc: true,
		python: false,
		ruby: true,
	},

	{
		key: "m",
		code: "%m",
		conversion: "m",
		category: "month",
		range: "01..12",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "B",
		code: "%B",
		conversion: "B",
		category: "month",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "b",
		code: "%b",
		conversion: "b",
		category: "month",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "h",
		code: "%h",
		conversion: "h",
		category: "month",
		glibc: true,
		python: false,
		ruby: true,
	},

	{
		key: "V",
		code: "%V",
		conversion: "V",
		category: "week",
		range: "01..53",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "U",
		code: "%U",
		conversion: "U",
		category: "week",
		range: "00..53",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "W",
		code: "%W",
		conversion: "W",
		category: "week",
		range: "00..53",
		glibc: true,
		python: true,
		ruby: true,
	},

	{
		key: "d",
		code: "%d",
		conversion: "d",
		category: "day",
		range: "01..31",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "e",
		code: "%e",
		conversion: "e",
		category: "day",
		range: " 1..31",
		glibc: true,
		python: false,
		ruby: true,
	},
	{
		key: "j",
		code: "%j",
		conversion: "j",
		category: "day",
		range: "001..366",
		glibc: true,
		python: true,
		ruby: true,
	},

	{
		key: "A",
		code: "%A",
		conversion: "A",
		category: "weekday",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "a",
		code: "%a",
		conversion: "a",
		category: "weekday",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "u",
		code: "%u",
		conversion: "u",
		category: "weekday",
		range: "1..7",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "w",
		code: "%w",
		conversion: "w",
		category: "weekday",
		range: "0..6",
		glibc: true,
		python: true,
		ruby: true,
	},

	{
		key: "H",
		code: "%H",
		conversion: "H",
		category: "hour",
		range: "00..23",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "I",
		code: "%I",
		conversion: "I",
		category: "hour",
		range: "01..12",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "k",
		code: "%k",
		conversion: "k",
		category: "hour",
		range: " 0..23",
		glibc: true,
		python: false,
		ruby: true,
	},
	{
		key: "l",
		code: "%l",
		conversion: "l",
		category: "hour",
		range: " 1..12",
		glibc: true,
		python: false,
		ruby: true,
	},
	{
		key: "p",
		code: "%p",
		conversion: "p",
		category: "hour",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "P",
		code: "%P",
		conversion: "P",
		category: "hour",
		glibc: true,
		python: false,
		ruby: true,
	},

	{
		key: "M",
		code: "%M",
		conversion: "M",
		category: "minute",
		range: "00..59",
		glibc: true,
		python: true,
		ruby: true,
	},

	{
		key: "S",
		code: "%S",
		conversion: "S",
		category: "second",
		range: "00..60",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "L",
		code: "%L",
		conversion: "L",
		category: "second",
		range: "000..999",
		glibc: false,
		python: false,
		ruby: true,
	},
	{
		key: "N",
		code: "%N",
		conversion: "N",
		category: "second",
		glibc: false,
		python: false,
		ruby: true,
	},
	{
		key: "f",
		code: "%f",
		conversion: "f",
		category: "second",
		range: "000000..999999",
		glibc: false,
		python: true,
		ruby: false,
	},

	{
		key: "z",
		code: "%z",
		conversion: "z",
		category: "timezone",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "zColon",
		code: "%:z",
		conversion: "z",
		category: "timezone",
		glibc: false,
		python: true,
		ruby: true,
	},
	{
		key: "zColonColon",
		code: "%::z",
		conversion: "z",
		category: "timezone",
		glibc: false,
		python: false,
		ruby: true,
	},
	{
		key: "Z",
		code: "%Z",
		conversion: "Z",
		category: "timezone",
		glibc: true,
		python: true,
		ruby: true,
	},

	{
		key: "s",
		code: "%s",
		conversion: "s",
		category: "epoch",
		glibc: true,
		python: false,
		ruby: true,
	},

	{
		key: "F",
		code: "%F",
		conversion: "F",
		category: "composite",
		glibc: true,
		python: false,
		ruby: true,
	},
	{
		key: "D",
		code: "%D",
		conversion: "D",
		category: "composite",
		glibc: true,
		python: false,
		ruby: true,
	},
	{
		key: "T",
		code: "%T",
		conversion: "T",
		category: "composite",
		glibc: true,
		python: false,
		ruby: true,
	},
	{
		key: "R",
		code: "%R",
		conversion: "R",
		category: "composite",
		glibc: true,
		python: false,
		ruby: true,
	},
	{
		key: "r",
		code: "%r",
		conversion: "r",
		category: "composite",
		glibc: true,
		python: false,
		ruby: true,
	},
	{
		key: "c",
		code: "%c",
		conversion: "c",
		category: "composite",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "x",
		code: "%x",
		conversion: "x",
		category: "composite",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "X",
		code: "%X",
		conversion: "X",
		category: "composite",
		glibc: true,
		python: true,
		ruby: true,
	},
	{
		key: "v",
		code: "%v",
		conversion: "v",
		category: "composite",
		glibc: false,
		python: false,
		ruby: true,
	},
	{
		key: "plus",
		code: "%+",
		conversion: "+",
		category: "composite",
		glibc: false,
		python: false,
		ruby: true,
	},

	{
		key: "n",
		code: "%n",
		conversion: "n",
		category: "literal",
		glibc: true,
		python: false,
		ruby: true,
	},
	{
		key: "t",
		code: "%t",
		conversion: "t",
		category: "literal",
		glibc: true,
		python: false,
		ruby: true,
	},
	{
		key: "percent",
		code: "%%",
		conversion: "%",
		category: "literal",
		glibc: true,
		python: true,
		ruby: true,
	},
];

// Lookup by display code, e.g. "%:z" -> directive entry
export const DIRECTIVE_BY_CODE = new Map(DIRECTIVES.map((d) => [d.code, d]));

/**
 * Find the catalog entry matching a parsed token, taking the %z colon
 * variants into account (the conversion char alone is ambiguous for them).
 *
 * @param conversion - Conversion character from the tokenizer
 * @param colons - Number of colon flags (only meaningful for z)
 * @returns The catalog entry, or undefined for unknown conversions
 */
export function findDirective(conversion: string, colons: number): Directive | undefined {
	if (conversion === "z") {
		return DIRECTIVE_BY_CODE.get(colons === 2 ? "%::z" : colons === 1 ? "%:z" : "%z");
	}
	return DIRECTIVES.find((d) => d.conversion === conversion);
}
