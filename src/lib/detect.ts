/*
 * Best-effort inference of a strftime format from a pasted example date.
 * The engine itself is strictly one-way; this reverses the common building
 * blocks (ISO, RFC 2822, US/EU dates, localized month and weekday names) with
 * a left-to-right scan that, at each position, prefers the most specific match
 * (name, then timezone, then meridiem, then number) and falls back to a
 * literal. Day/month order is the main ambiguity and is resolved by value
 * ranges first, then by the caller-supplied order. Confidence is driven by a
 * round-trip: the matched fields rebuild a Date, which is re-rendered through
 * the real engine and compared field by field with the original input.
 */

import { C_LOCALE, strftime } from "@/lib/strftime";

export type DateOrder = "mdy" | "dmy";

export interface DetectOptions {
	locale: string;
	order: DateOrder;
}

export interface DetectResult {
	format: string;
	confidence: number;
	ambiguities: string[];
}

/* ------------------------------------------------------------------ */
/* Locale name tables                                                  */
/* ------------------------------------------------------------------ */

interface NameEntry {
	text: string;
	code: string; // %A %a %B %b
	kind: "weekday" | "month";
	index: number; // 0-based month, or weekday with Sunday = 0
}

interface MeridiemEntry {
	text: string;
	pm: boolean;
}

const nameCache = new Map<string, NameEntry[]>();
const meridiemCache = new Map<string, MeridiemEntry[]>();

// Month and weekday names for the active locale and the C locale, longest
// first so %B beats %b and %A beats %a when one is a prefix of the other
function buildNames(locale: string): NameEntry[] {
	const cached = nameCache.get(locale);
	if (cached) {
		return cached;
	}
	const entries: NameEntry[] = [];
	const seen = new Set<string>();
	const push = (raw: string, code: string, kind: NameEntry["kind"], index: number) => {
		const text = raw.replace(/\.$/, "").trim();
		const key = code + "|" + text.toLowerCase();
		if (!text || seen.has(key)) {
			return;
		}
		seen.add(key);
		entries.push({ text, code, kind, index });
	};
	for (const loc of [locale, C_LOCALE]) {
		for (let m = 0; m < 12; m++) {
			const date = new Date(2021, m, 15, 12);
			push(strftime(date, "%B", loc), "%B", "month", m);
			push(strftime(date, "%b", loc), "%b", "month", m);
		}
		// 2021-08-01 is a Sunday, so the offset doubles as the weekday index
		for (let w = 0; w < 7; w++) {
			const date = new Date(2021, 7, 1 + w, 12);
			push(strftime(date, "%A", loc), "%A", "weekday", w);
			push(strftime(date, "%a", loc), "%a", "weekday", w);
		}
	}
	entries.sort((a, b) => b.text.length - a.text.length);
	nameCache.set(locale, entries);
	return entries;
}

function buildMeridiems(locale: string): MeridiemEntry[] {
	const cached = meridiemCache.get(locale);
	if (cached) {
		return cached;
	}
	const entries: MeridiemEntry[] = [];
	const seen = new Set<string>();
	const push = (raw: string, pm: boolean) => {
		const text = raw.trim();
		const key = text.toLowerCase() + "|" + pm;
		if (!text || seen.has(key)) {
			return;
		}
		seen.add(key);
		entries.push({ text, pm });
	};
	for (const loc of [locale, C_LOCALE]) {
		push(strftime(new Date(2021, 0, 1, 9), "%p", loc), false);
		push(strftime(new Date(2021, 0, 1, 15), "%p", loc), true);
	}
	entries.sort((a, b) => b.text.length - a.text.length);
	meridiemCache.set(locale, entries);
	return entries;
}

/* ------------------------------------------------------------------ */
/* Scanning                                                            */
/* ------------------------------------------------------------------ */

type Role = "Y4" | "Y2" | "m" | "d" | "H" | "M" | "S" | "frac";

interface Atom {
	kind: "literal" | "name" | "meridiem" | "tz" | "number";
	source: string;
	code?: string;
	nameKind?: "weekday" | "month";
	index?: number;
	pm?: boolean;
	value?: number;
	digits?: number;
	role?: Role;
}

const LETTER = /\p{L}/u;
const isLetter = (ch: string | undefined): boolean => !!ch && LETTER.test(ch);

// Match the longest table entry whose text sits on word boundaries at pos
function matchEntry<T extends { text: string }>(
	input: string,
	pos: number,
	entries: T[],
): T | null {
	if (isLetter(input[pos - 1])) {
		return null;
	}
	for (const entry of entries) {
		const len = entry.text.length;
		const slice = input.slice(pos, pos + len);
		if (slice.toLowerCase() === entry.text.toLowerCase() && !isLetter(input[pos + len])) {
			return entry;
		}
	}
	return null;
}

function scan(input: string, names: NameEntry[], meridiems: MeridiemEntry[]): Atom[] {
	const atoms: Atom[] = [];
	let literal = "";
	const flush = () => {
		if (literal) {
			atoms.push({ kind: "literal", source: literal });
			literal = "";
		}
	};

	let i = 0;
	while (i < input.length) {
		const name = matchEntry(input, i, names);
		if (name) {
			flush();
			const source = input.slice(i, i + name.text.length);
			atoms.push({
				kind: "name",
				source,
				code: name.code,
				nameKind: name.kind,
				index: name.index,
			});
			i += source.length;
			continue;
		}

		const rest = input.slice(i);
		const tzColon = /^[+-]\d{2}:\d{2}/.exec(rest);
		const tzPlain = tzColon ? null : /^[+-]\d{4}/.exec(rest);
		const tz = tzColon ?? tzPlain;
		if (tz) {
			flush();
			atoms.push({ kind: "tz", source: tz[0], code: tzColon ? "%:z" : "%z" });
			i += tz[0].length;
			continue;
		}

		const meridiem = matchEntry(input, i, meridiems);
		if (meridiem) {
			flush();
			const source = input.slice(i, i + meridiem.text.length);
			atoms.push({
				kind: "meridiem",
				source,
				code: source === source.toLowerCase() ? "%P" : "%p",
				pm: meridiem.pm,
			});
			i += source.length;
			continue;
		}

		const number = /^\d+/.exec(rest);
		if (number) {
			flush();
			atoms.push({
				kind: "number",
				source: number[0],
				value: parseInt(number[0], 10),
				digits: number[0].length,
			});
			i += number[0].length;
			continue;
		}

		literal += input[i];
		i += 1;
	}
	flush();
	return atoms;
}

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

// Separator characters touching a number atom, used to tell time fields
// (joined by ":") and fractions ("." after the seconds) from date fields
function neighborSeparators(atoms: Atom[], idx: number): { before: string; after: string } {
	const prev = atoms[idx - 1];
	const next = atoms[idx + 1];
	return {
		before: prev?.kind === "literal" ? prev.source.slice(-1) : "",
		after: next?.kind === "literal" ? next.source.slice(0, 1) : "",
	};
}

function fracCode(digits: number): string {
	return digits === 3 ? "%L" : digits === 6 ? "%f" : `%${digits}N`;
}

const ROLE_CODE: Record<Exclude<Role, "H" | "frac">, string> = {
	Y4: "%Y",
	Y2: "%y",
	m: "%m",
	d: "%d",
	M: "%M",
	S: "%S",
};

// Assign month/day among a pair of 1-2 digit numbers, preferring value ranges
// (a number over 12 can only be a day) and falling back to the caller's order
function assignPair(p: Atom, q: Atom, order: DateOrder): { ambiguous: boolean } {
	const pv = p.value ?? 0;
	const qv = q.value ?? 0;
	let monthFirst: boolean;
	let ambiguous = false;
	if (pv > 12 && qv <= 12) {
		monthFirst = false;
	} else if (qv > 12 && pv <= 12) {
		monthFirst = true;
	} else {
		monthFirst = order === "mdy";
		ambiguous = true;
	}
	(monthFirst ? p : q).role = "m";
	(monthFirst ? q : p).role = "d";
	return { ambiguous };
}

function classify(atoms: Atom[], order: DateOrder): { ambiguous: boolean } {
	const numbers = atoms
		.map((atom, idx) => ({ atom, idx }))
		.filter(({ atom }) => atom.kind === "number");

	// Time fields: the run of numbers chained by colons becomes H, M, S
	let placed = 0;
	for (const { atom, idx } of numbers) {
		const { before, after } = neighborSeparators(atoms, idx);
		if (before !== ":" && after !== ":") {
			continue;
		}
		if (before !== ":") {
			atom.role = "H";
			placed = 1;
		} else if (placed === 1) {
			atom.role = "M";
			placed = 2;
		} else if (placed === 2) {
			atom.role = "S";
			placed = 3;
		}
	}

	// Fractional seconds: a number written right after the seconds with a dot
	for (const { atom, idx } of numbers) {
		if (atom.role || neighborSeparators(atoms, idx).before !== ".") {
			continue;
		}
		const prev = numbers.filter((n) => n.idx < idx).pop();
		if (prev?.atom.role === "S") {
			atom.role = "frac";
			atom.code = fracCode(atom.digits ?? 0);
		}
	}

	// Date fields: the remaining numbers, plus the month name if one was found
	const slots = atoms.filter(
		(atom) =>
			(atom.kind === "number" && !atom.role) ||
			(atom.kind === "name" && atom.nameKind === "month"),
	);
	const monthName = slots.find((s) => s.kind === "name");
	const year4 = slots.find((s) => s.kind === "number" && (s.digits ?? 0) === 4);
	if (year4) {
		year4.role = "Y4";
	}
	// Only 1-2 digit numbers stand in for month/day/two-digit year; the lone
	// four-digit year is handled above, and any other run is left as a literal
	const rest = slots.filter((s) => s.kind === "number" && !s.role && (s.digits ?? 0) <= 2);
	let ambiguous = false;

	if (monthName) {
		// The name carries the month; numbers around it are the day and year
		const [first, second] = rest;
		if (first && (first.value ?? 0) > 31) {
			first.role = "Y2";
			if (second) second.role = "d";
		} else {
			if (first) first.role = "d";
			if (second && !year4) second.role = "Y2";
			else if (second) second.role = "d";
		}
	} else if (year4) {
		if (rest.length >= 2) {
			const [p, q] = rest;
			// Year leading the group reads as ISO (Y-m-d), which is unambiguous
			if (slots.indexOf(year4) < slots.indexOf(p)) {
				// ISO Y-m-d: the first number is the month unless its value (>12)
				// rules that out, in which case the order is reversed
				const monthFirst = !((p.value ?? 0) > 12 && (q.value ?? 0) <= 12);
				(monthFirst ? p : q).role = "m";
				(monthFirst ? q : p).role = "d";
			} else {
				ambiguous = assignPair(p, q, order).ambiguous;
			}
		} else if (rest.length === 1) {
			rest[0].role = "m";
		}
	} else if (rest.length === 3) {
		const [p, q, r] = rest;
		if ((p.value ?? 0) > 31) {
			// Leading value over 31 marks a year-first group, so q-then-r is the
			// month-day pair (reversed only when q cannot be a month)
			p.role = "Y2";
			const monthFirst = !((q.value ?? 0) > 12 && (r.value ?? 0) <= 12);
			(monthFirst ? q : r).role = "m";
			(monthFirst ? r : q).role = "d";
		} else {
			r.role = "Y2";
			ambiguous = assignPair(p, q, order).ambiguous;
		}
	} else if (rest.length === 2) {
		ambiguous = assignPair(rest[0], rest[1], order).ambiguous;
	} else if (rest.length === 1) {
		rest[0].role = (rest[0].value ?? 0) > 31 ? "Y2" : "d";
	}

	// Resolve the hour now that we know whether a meridiem is present
	const hasMeridiem = atoms.some((a) => a.kind === "meridiem");
	for (const { atom } of numbers) {
		if (atom.role === "H") {
			atom.code = hasMeridiem && (atom.value ?? 0) <= 12 ? "%I" : "%H";
		} else if (atom.role && atom.role !== "frac") {
			atom.code = ROLE_CODE[atom.role];
		}
	}

	return { ambiguous };
}

/* ------------------------------------------------------------------ */
/* Assembly and round-trip validation                                  */
/* ------------------------------------------------------------------ */

function assemble(atoms: Atom[]): { format: string; directives: number } {
	let format = "";
	let directives = 0;
	for (const atom of atoms) {
		if (atom.code && atom.kind !== "literal") {
			format += atom.code;
			directives += 1;
		} else {
			// Literals and unclassified digits stay verbatim; escape any percent
			format += atom.source.replace(/%/g, "%%");
		}
	}
	return { format, directives };
}

function reconstruct(atoms: Atom[]): { date: Date; complete: boolean } | null {
	const fields: Partial<
		Record<"year" | "month" | "day" | "hour" | "min" | "sec" | "ms", number>
	> = {};
	let hourAtom: Atom | null = null;
	let pm: boolean | null = null;
	for (const atom of atoms) {
		if (atom.kind === "name" && atom.nameKind === "month") {
			fields.month = atom.index;
		} else if (atom.kind === "meridiem") {
			pm = atom.pm ?? null;
		} else if (atom.kind === "number") {
			const value = atom.value ?? 0;
			switch (atom.role) {
				case "Y4":
					fields.year = value;
					break;
				case "Y2":
					fields.year = 2000 + value;
					break;
				case "m":
					fields.month = value - 1;
					break;
				case "d":
					fields.day = value;
					break;
				case "H":
					fields.hour = value;
					hourAtom = atom;
					break;
				case "M":
					fields.min = value;
					break;
				case "S":
					fields.sec = value;
					break;
				case "frac":
					fields.ms = parseInt(String(value).padEnd(3, "0").slice(0, 3), 10);
					break;
			}
		}
	}

	if (hourAtom?.code === "%I" && pm !== null) {
		const hour = fields.hour ?? 0;
		if (pm && hour < 12) fields.hour = hour + 12;
		if (!pm && hour === 12) fields.hour = 0;
	}

	const date = new Date(
		fields.year ?? 2001,
		fields.month ?? 0,
		fields.day ?? 1,
		fields.hour ?? 0,
		fields.min ?? 0,
		fields.sec ?? 0,
		fields.ms ?? 0,
	);
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	const complete =
		fields.year !== undefined && fields.month !== undefined && fields.day !== undefined;
	return { date, complete };
}

const clean = (value: string): string => value.toLowerCase().replace(/\.$/, "").trim();

// Re-render every reproducible field and measure how much of it matches the
// input. Offsets, zone names and fractions depend on the machine and are left
// out; weekday names only count once the full date is known.
function score(atoms: Atom[], locale: string): number {
	const rebuilt = reconstruct(atoms);
	if (!rebuilt) {
		return 0;
	}
	const { date, complete } = rebuilt;
	let comparable = 0;
	let matched = 0;
	for (const atom of atoms) {
		if (atom.kind === "name") {
			if (atom.nameKind === "weekday" && !complete) {
				continue;
			}
			comparable += 1;
			if (clean(strftime(date, atom.code ?? "", locale)) === clean(atom.source)) {
				matched += 1;
			}
		} else if (atom.kind === "meridiem") {
			comparable += 1;
			if (clean(strftime(date, atom.code ?? "", locale)) === clean(atom.source)) {
				matched += 1;
			}
		} else if (atom.kind === "number" && atom.code && atom.role !== "frac") {
			comparable += 1;
			if (parseInt(strftime(date, atom.code, locale), 10) === atom.value) {
				matched += 1;
			}
		}
	}
	return comparable === 0 ? 0.5 : matched / comparable;
}

/**
 * Infer a strftime format from an example date string.
 *
 * @param input - Pasted example, e.g. "Mon, 15 Mar 2024 14:30"
 * @param options - Active locale (for names) and the day/month order to assume
 * @returns The inferred format, a 0..1 confidence, and any ambiguities hit
 *          ("order" when the day/month split was a guess). An empty format
 *          means nothing recognizable was found.
 */
export function detectFormat(input: string, { locale, order }: DetectOptions): DetectResult {
	const trimmed = input.trim();
	if (!trimmed) {
		return { format: "", confidence: 0, ambiguities: [] };
	}
	const atoms = scan(trimmed, buildNames(locale), buildMeridiems(locale));
	const { ambiguous } = classify(atoms, order);
	const { format, directives } = assemble(atoms);
	if (directives === 0) {
		return { format: "", confidence: 0, ambiguities: [] };
	}
	return {
		format,
		confidence: score(atoms, locale),
		ambiguities: ambiguous ? ["order"] : [],
	};
}
