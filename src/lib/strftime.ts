/*
 * Pure TypeScript strftime engine, glibc dialect plus the Ruby and Python
 * extensions (%L, %N, %f, %:z, %::z, %v, %+). Locale-dependent directives go
 * through Intl, with a hardcoded "C" (POSIX) locale for byte-exact man-page
 * output. E/O modifiers are accepted and ignored, which matches glibc when the
 * locale defines no alternative representation.
 */

export type PaddingFlag = "-" | "_" | "0";
export type CaseFlag = "^" | "#";

export interface DirectiveToken {
	kind: "directive";
	raw: string;
	conversion: string;
	padding?: PaddingFlag;
	casing?: CaseFlag;
	width?: number;
	colons: number;
	modifier?: "E" | "O";
}

export interface LiteralToken {
	kind: "literal";
	raw: string;
}

export interface InvalidToken {
	kind: "invalid";
	raw: string;
}

export type Token = DirectiveToken | LiteralToken | InvalidToken;

// All conversion characters the engine understands
export const CONVERSIONS = new Set([..."aAbBcCdDeFfgGhHIjklLmMnNpPrRsStTuUvVwWxXyYzZ", "%", "+"]);

const TOKEN_RE = /^%([-_0^#]*)(\d*)([EO])?(::?)?(.)/;

/**
 * Split a strftime format string into directive, literal and invalid tokens.
 * Consecutive literal characters are merged into a single token; an invalid
 * token is any % sequence whose conversion character is unknown, or a
 * trailing %.
 *
 * @param format - The raw strftime format string
 * @returns Ordered token list whose concatenated raw values equal the input
 */
export function tokenize(format: string): Token[] {
	const tokens: Token[] = [];
	let literal = "";

	const flushLiteral = () => {
		if (literal) {
			tokens.push({ kind: "literal", raw: literal });
			literal = "";
		}
	};

	let i = 0;
	while (i < format.length) {
		if (format[i] !== "%") {
			literal += format[i];
			i += 1;
			continue;
		}
		const match = TOKEN_RE.exec(format.slice(i));
		if (!match) {
			// Trailing % at the very end, or % followed by a line terminator;
			// consume just that pair so later directives still tokenize
			flushLiteral();
			tokens.push({ kind: "invalid", raw: format.slice(i, i + 2) });
			i += 2;
			continue;
		}
		const [raw, flags, widthStr, modifier, colons, conversion] = match;
		flushLiteral();
		if (!CONVERSIONS.has(conversion) || (colons && conversion !== "z")) {
			tokens.push({ kind: "invalid", raw });
		} else {
			const padding = [...flags]
				.reverse()
				.find((f): f is PaddingFlag => ["-", "_", "0"].includes(f));
			const casing = [...flags].reverse().find((f): f is CaseFlag => ["^", "#"].includes(f));
			tokens.push({
				kind: "directive",
				raw,
				conversion,
				padding,
				casing,
				width: widthStr ? parseInt(widthStr, 10) : undefined,
				colons: colons ? colons.length : 0,
				modifier: modifier as "E" | "O" | undefined,
			});
		}
		i += raw.length;
	}
	flushLiteral();
	return tokens;
}

/**
 * Rebuild the raw text of a directive token from its parsed parts.
 * Used by the builder UI when the user changes padding, casing or width on a
 * chip, so the format string stays the single source of truth.
 *
 * @param token - Parsed directive token (raw field is ignored)
 * @returns Canonical raw text, e.g. "%-d" or "%::z"
 */
export function buildDirective(token: Omit<DirectiveToken, "kind" | "raw">): string {
	return (
		"%" +
		(token.padding ?? "") +
		(token.casing ?? "") +
		(token.width ?? "") +
		(token.modifier ?? "") +
		":".repeat(token.colons) +
		token.conversion
	);
}

/**
 * Reassemble a token list into a format string.
 * Inverse of tokenize: concatenating every token's raw field is lossless.
 *
 * @param tokens - Token list, typically from tokenize or the builder
 * @returns The reconstructed strftime format string
 */
export function buildFormat(tokens: Token[]): string {
	return tokens.map((t) => t.raw).join("");
}

/* ------------------------------------------------------------------ */
/* Locale handling                                                     */
/* ------------------------------------------------------------------ */

// "C" selects the hardcoded POSIX locale, anything else is a BCP 47 tag
export const C_LOCALE = "C";

const C_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const C_MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
	const key = locale + JSON.stringify(options);
	let formatter = formatterCache.get(key);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(locale, options);
		formatterCache.set(key, formatter);
	}
	return formatter;
}

function intlPart(
	date: Date,
	locale: string,
	options: Intl.DateTimeFormatOptions,
	type: Intl.DateTimeFormatPartTypes,
): string {
	const parts = getFormatter(locale, options).formatToParts(date);
	return parts.find((p) => p.type === type)?.value ?? "";
}

function weekdayName(date: Date, locale: string, long: boolean): string {
	if (locale === C_LOCALE) {
		const name = C_DAYS[date.getDay()];
		return long ? name : name.slice(0, 3);
	}
	return intlPart(date, locale, { weekday: long ? "long" : "short" }, "weekday");
}

function monthName(date: Date, locale: string, long: boolean): string {
	if (locale === C_LOCALE) {
		const name = C_MONTHS[date.getMonth()];
		return long ? name : name.slice(0, 3);
	}
	return intlPart(date, locale, { month: long ? "long" : "short" }, "month");
}

function meridiem(date: Date, locale: string): string {
	const fallback = date.getHours() < 12 ? "AM" : "PM";
	if (locale === C_LOCALE) {
		return fallback;
	}
	const part = intlPart(date, locale, { hour: "numeric", hour12: true }, "dayPeriod");
	return part || fallback;
}

// True when Intl returned a real abbreviation rather than a GMT+X offset;
// a bare "GMT" (London in winter) is a legitimate abbreviation and passes
function isAbbreviation(value: string): boolean {
	return value.length > 0 && !/^(GMT|UTC)./.test(value);
}

/**
 * Best-effort time zone abbreviation for %Z, like glibc's tzname.
 * CLDR only ships abbreviations for some locale and zone pairs: en-US covers
 * the American ones (EST, PDT...), en-GB the European ones (CET, BST...), and
 * for the rest the initials of the long name give the conventional form
 * (Japan Standard Time -> JST). Falls back to the GMT offset notation.
 *
 * @param date - Date whose zone name is wanted (DST-sensitive)
 * @returns Abbreviation such as CEST, or a GMT offset when none exists
 */
function timezoneName(date: Date): string {
	const us = intlPart(date, "en-US", { timeZoneName: "short" }, "timeZoneName");
	if (isAbbreviation(us)) {
		return us;
	}
	const gb = intlPart(date, "en-GB", { timeZoneName: "short" }, "timeZoneName");
	if (isAbbreviation(gb)) {
		return gb;
	}
	const long = intlPart(date, "en-US", { timeZoneName: "long" }, "timeZoneName");
	if (/^[A-Za-z ]+$/.test(long)) {
		const abbr = long
			.split(" ")
			.map((word) => word[0])
			.join("")
			.toUpperCase();
		if (abbr.length >= 2) {
			return abbr;
		}
	}
	return us;
}

/* ------------------------------------------------------------------ */
/* Date math helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Day of the year, 1-based (Jan 1 = 1).
 * Computed on UTC projections of the local calendar date so DST transitions
 * cannot skew the division.
 *
 * @param date - Local date to evaluate
 * @returns Ordinal day in the range 1..366
 */
export function dayOfYear(date: Date): number {
	const startUtc = Date.UTC(date.getFullYear(), 0, 1);
	const dayUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
	return (dayUtc - startUtc) / 86400000 + 1;
}

// %U: week of the year, first Sunday starts week 01
function weekSunday(date: Date): number {
	return Math.floor((dayOfYear(date) - 1 + 7 - date.getDay()) / 7);
}

// %W: week of the year, first Monday starts week 01
function weekMonday(date: Date): number {
	return Math.floor((dayOfYear(date) - 1 + 7 - ((date.getDay() + 6) % 7)) / 7);
}

/**
 * ISO 8601 week date parts for %V, %G and %g.
 * Week 01 is the week containing the first Thursday of the year, so the ISO
 * year can differ from the calendar year in the first and last days of it.
 *
 * @param date - Local date to classify
 * @returns ISO week number (1..53) and the ISO week-based year
 */
export function isoWeek(date: Date): { week: number; year: number } {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	// Move to the Thursday of the current ISO week
	d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);
	const year = d.getUTCFullYear();
	const firstThursday = new Date(Date.UTC(year, 0, 4));
	firstThursday.setUTCDate(
		firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3,
	);
	const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
	return { week, year };
}

function utcOffset(date: Date, colons: number): string {
	const total = -date.getTimezoneOffset();
	const sign = total < 0 ? "-" : "+";
	const abs = Math.abs(total);
	const hh = String(Math.floor(abs / 60)).padStart(2, "0");
	const mm = String(abs % 60).padStart(2, "0");
	if (colons === 0) return sign + hh + mm;
	if (colons === 1) return sign + hh + ":" + mm;
	return sign + hh + ":" + mm + ":00";
}

function fractionalSeconds(date: Date, digits: number): string {
	const nanos = String(date.getMilliseconds()).padStart(3, "0") + "000000";
	return digits <= 9 ? nanos.slice(0, digits) : nanos.padEnd(digits, "0");
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

type DefaultPadding = { char: "0" | " "; width: number } | null;

// Default zero/space padding per conversion, per the glibc and Ruby man pages
function defaultPadding(conversion: string): DefaultPadding {
	switch (conversion) {
		case "C":
		case "d":
		case "g":
		case "H":
		case "I":
		case "m":
		case "M":
		case "S":
		case "U":
		case "V":
		case "W":
		case "y":
			return { char: "0", width: 2 };
		case "j":
			return { char: "0", width: 3 };
		case "L":
			return { char: "0", width: 3 };
		case "e":
		case "k":
		case "l":
			return { char: " ", width: 2 };
		case "Y":
		case "G":
			return { char: "0", width: 4 };
		// %F and %z have no default width, but glibc zero-pads them after the
		// sign when an explicit width is given
		case "F":
		case "z":
			return { char: "0", width: 0 };
		default:
			return null;
	}
}

// Composite directives expressed in terms of simpler ones (POSIX definitions)
const COMPOSITES: Record<string, string> = {
	D: "%m/%d/%y",
	F: "%Y-%m-%d",
	R: "%H:%M",
	T: "%H:%M:%S",
	r: "%I:%M:%S %p",
	v: "%e-%^b-%Y",
	"+": "%a %b %e %H:%M:%S %Z %Y",
};

function rawValue(token: DirectiveToken, date: Date, locale: string): string {
	const { conversion, colons } = token;
	switch (conversion) {
		case "a":
			return weekdayName(date, locale, false);
		case "A":
			return weekdayName(date, locale, true);
		case "b":
		case "h":
			return monthName(date, locale, false);
		case "B":
			return monthName(date, locale, true);
		case "c":
			return locale === C_LOCALE
				? strftime(date, "%a %b %e %H:%M:%S %Y", locale)
				: getFormatter(locale, { dateStyle: "full", timeStyle: "medium" }).format(date);
		case "C":
			return String(Math.floor(date.getFullYear() / 100));
		case "d":
			return String(date.getDate());
		case "e":
			return String(date.getDate());
		case "g":
			return String(isoWeek(date).year % 100);
		case "G":
			return String(isoWeek(date).year);
		case "H":
			return String(date.getHours());
		case "I":
			return String(((date.getHours() + 11) % 12) + 1);
		case "j":
			return String(dayOfYear(date));
		case "k":
			return String(date.getHours());
		case "l":
			return String(((date.getHours() + 11) % 12) + 1);
		case "L":
			return String(date.getMilliseconds());
		case "m":
			return String(date.getMonth() + 1);
		case "M":
			return String(date.getMinutes());
		case "n":
			return "\n";
		case "N":
			return fractionalSeconds(date, token.width ?? 9);
		case "p":
			return meridiem(date, locale).toUpperCase();
		case "P":
			return meridiem(date, locale).toLowerCase();
		case "s":
			return String(Math.floor(date.getTime() / 1000));
		case "S":
			return String(date.getSeconds());
		case "t":
			return "\t";
		case "u":
			return String(((date.getDay() + 6) % 7) + 1);
		case "U":
			return String(weekSunday(date));
		case "V":
			return String(isoWeek(date).week);
		case "w":
			return String(date.getDay());
		case "W":
			return String(weekMonday(date));
		case "x":
			return locale === C_LOCALE
				? strftime(date, "%m/%d/%y", locale)
				: getFormatter(locale, { dateStyle: "short" }).format(date);
		case "X":
			return locale === C_LOCALE
				? strftime(date, "%H:%M:%S", locale)
				: getFormatter(locale, { timeStyle: "medium" }).format(date);
		case "y":
			return String(((date.getFullYear() % 100) + 100) % 100);
		case "Y":
			return String(date.getFullYear());
		case "z":
			return utcOffset(date, colons);
		case "Z":
			return timezoneName(date);
		case "%":
			return "%";
		case "f":
			return fractionalSeconds(date, 6);
		default:
			return COMPOSITES[conversion] !== undefined
				? strftime(date, COMPOSITES[conversion], locale)
				: token.raw;
	}
}

// glibc's "#" flag uppercases the name conversions and lowercases %p and %Z;
// on everything else it is a no-op
function applyCase(value: string, casing: CaseFlag | undefined, conversion: string): string {
	if (casing === "^") return value.toUpperCase();
	if (casing === "#") {
		if ("aAbBh".includes(conversion)) return value.toUpperCase();
		if (conversion === "p" || conversion === "Z") return value.toLowerCase();
	}
	return value;
}

/**
 * Render a single directive token for a given date and preview locale.
 * Applies the glibc flag semantics on top of the raw value: padding override
 * (-, _, 0), case change (^, #) and minimum field width.
 *
 * @param token - Parsed directive token
 * @param date - Date to render
 * @param locale - Preview locale ("C" for POSIX, else a BCP 47 tag)
 * @returns Formatted fragment for this token
 */
export function renderToken(token: Token, date: Date, locale: string): string {
	if (token.kind !== "directive") return token.raw;

	let value = rawValue(token, date, locale);
	const defaults = defaultPadding(token.conversion);
	// glibc treats the "-" flag as pad-with-spaces when an explicit width remains
	const padChar =
		token.padding === "_" || token.padding === "-"
			? " "
			: token.padding === "0"
				? "0"
				: defaults?.char;
	const baseWidth = token.padding === "-" ? 0 : (defaults?.width ?? 0);
	// %N interprets the width as precision, already handled in rawValue
	const width = token.conversion === "N" ? 0 : Math.max(baseWidth, token.width ?? 0);

	if (width > value.length) {
		const sign = value.startsWith("-") || value.startsWith("+") ? value[0] : "";
		const body = sign ? value.slice(1) : value;
		// Zero padding goes after the sign; bare numbers also zero-pad by default
		value =
			padChar === "0" || (padChar === undefined && /^\d+$/.test(body))
				? sign + body.padStart(width - sign.length, "0")
				: value.padStart(width, " ");
	}
	return applyCase(value, token.casing, token.conversion);
}

/**
 * Format a date with a strftime format string.
 *
 * @param date - Date to format
 * @param format - strftime format string, e.g. "%Y-%m-%d %H:%M:%S"
 * @param locale - Preview locale ("C" for POSIX, else a BCP 47 tag)
 * @returns Formatted string; invalid directives are emitted verbatim
 */
export function strftime(date: Date, format: string, locale: string = C_LOCALE): string {
	return tokenize(format)
		.map((token) => renderToken(token, date, locale))
		.join("");
}
