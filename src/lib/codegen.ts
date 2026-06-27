/*
 * Translate the current strftime format into ready-to-paste snippets for other
 * ecosystems. Two strategies:
 *  - Passthrough (Python, Ruby, C, shell): strftime-native targets reuse the
 *    format verbatim, escaped for their string literal, with a caveat when a
 *    directive or flag is not honored by that target.
 *  - Token translation (Go, JavaScript/date-fns): map each conversion to the
 *    target's own layout token; directives with no equivalent are left in place
 *    and reported as caveats.
 */

import { type Dialect, findDirective } from "@/data/directives";
import { type DirectiveToken, type Token, tokenize } from "@/lib/strftime";

export type CaveatReason = "unsupported" | "flagsIgnored" | "glibcExtension" | "unmapped";

export interface Caveat {
	reason: CaveatReason;
	codes: string[];
}

export interface Snippet {
	id: string;
	label: string;
	lang: string;
	code: string;
	caveats: Caveat[];
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function directivesOf(tokens: Token[]): DirectiveToken[] {
	return tokens.filter((t): t is DirectiveToken => t.kind === "directive");
}

function hasFlags(token: DirectiveToken): boolean {
	return Boolean(token.padding || token.casing || token.width || token.modifier);
}

function caveat(reason: CaveatReason, codes: string[]): Caveat[] {
	const unique = [...new Set(codes)];
	return unique.length ? [{ reason, codes: unique }] : [];
}

function dialectSupport(token: DirectiveToken, dialect: Dialect): boolean {
	const directive = findDirective(token.conversion, token.colons);
	// Unknown to the catalog (e.g. %n, %t, %%) is treated as portable
	return directive ? directive[dialect] : true;
}

/* ------------------------------------------------------------------ */
/* Passthrough targets (strftime-native)                              */
/* ------------------------------------------------------------------ */

// Escape for a double-quoted string literal (Python, Ruby, C)
function escapeDoubleQuoted(format: string): string {
	return format.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Escape inside a double-quoted shell word: date +"..."
function escapeShell(format: string): string {
	return format.replace(/[\\"`$]/g, (c) => "\\" + c);
}

type FlagPolicy = "ok" | "ignored" | "extension";

interface PassthroughTarget {
	id: string;
	label: string;
	lang: string;
	escape: (format: string) => string;
	wrap: (escaped: string) => string;
	supports: (token: DirectiveToken) => boolean;
	flags: FlagPolicy;
}

const PYTHON: PassthroughTarget = {
	id: "python",
	label: "Python",
	lang: "python",
	escape: escapeDoubleQuoted,
	wrap: (f) => `from datetime import datetime\n\ndatetime.now().strftime("${f}")`,
	supports: (t) => dialectSupport(t, "python"),
	flags: "ignored",
};

const RUBY: PassthroughTarget = {
	id: "ruby",
	label: "Ruby",
	lang: "ruby",
	escape: escapeDoubleQuoted,
	wrap: (f) => `Time.now.strftime("${f}")`,
	supports: (t) => dialectSupport(t, "ruby"),
	flags: "ok",
};

const SHELL: PassthroughTarget = {
	id: "shell",
	label: "Shell",
	lang: "bash",
	escape: escapeShell,
	wrap: (f) => `date +"${f}"`,
	// GNU date covers glibc strftime plus %N and the %:z / %::z variants
	supports: (t) => dialectSupport(t, "glibc") || t.conversion === "N" || t.conversion === "z",
	flags: "ok",
};

const C: PassthroughTarget = {
	id: "c",
	label: "C",
	lang: "c",
	escape: escapeDoubleQuoted,
	wrap: (f) =>
		`char buf[64];\ntime_t now = time(NULL);\nstrftime(buf, sizeof buf, "${f}", localtime(&now));`,
	supports: (t) => dialectSupport(t, "glibc"),
	flags: "extension",
};

function buildPassthrough(target: PassthroughTarget, format: string, tokens: Token[]): Snippet {
	const dirs = directivesOf(tokens);
	const unsupported = dirs.filter((t) => !target.supports(t)).map((t) => t.raw);
	const flagged = dirs.filter(hasFlags).map((t) => t.raw);
	return {
		id: target.id,
		label: target.label,
		lang: target.lang,
		code: target.wrap(target.escape(format)),
		caveats: [
			...caveat("unsupported", unsupported),
			...(target.flags === "ignored" ? caveat("flagsIgnored", flagged) : []),
			...(target.flags === "extension" ? caveat("glibcExtension", flagged) : []),
		],
	};
}

/* ------------------------------------------------------------------ */
/* Token-translation targets (non-strftime ecosystems)               */
/* ------------------------------------------------------------------ */

interface TranslateTarget {
	id: string;
	label: string;
	lang: string;
	wrap: (pattern: string) => string;
	atomic: Record<string, string>;
	composite: Record<string, string>;
	zone: Record<number, string | undefined>;
	literal: (raw: string) => string;
	placeholder: (raw: string) => string;
}

// Escape a built pattern for a double-quoted Go / JS string literal
function quoteString(pattern: string): string {
	return pattern
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n")
		.replace(/\t/g, "\\t");
}

// date-fns parses letters as tokens, so any literal containing a letter must be
// wrapped in single quotes (a literal quote becomes '')
function datefnsLiteral(raw: string): string {
	if (!/[A-Za-z]/.test(raw)) return raw;
	return "'" + raw.replace(/'/g, "''") + "'";
}

const GO: TranslateTarget = {
	id: "go",
	label: "Go",
	lang: "go",
	wrap: (p) => `time.Now().Format("${quoteString(p)}")`,
	atomic: {
		Y: "2006",
		y: "06",
		m: "01",
		d: "02",
		e: "_2",
		H: "15",
		k: "15",
		I: "03",
		l: "3",
		M: "04",
		S: "05",
		p: "PM",
		P: "pm",
		a: "Mon",
		A: "Monday",
		b: "Jan",
		h: "Jan",
		B: "January",
		Z: "MST",
		"%": "%",
	},
	composite: {
		D: "01/02/06",
		F: "2006-01-02",
		R: "15:04",
		T: "15:04:05",
		r: "03:04:05 PM",
		v: "_2-Jan-2006",
	},
	zone: { 0: "-0700", 1: "-07:00" },
	literal: (raw) => raw,
	placeholder: (raw) => raw,
};

const DATEFNS: TranslateTarget = {
	id: "javascript",
	label: "JavaScript",
	lang: "javascript",
	wrap: (p) => `import { format } from "date-fns";\n\nformat(new Date(), "${quoteString(p)}")`,
	atomic: {
		Y: "yyyy",
		y: "yy",
		m: "MM",
		d: "dd",
		e: "d",
		H: "HH",
		k: "H",
		I: "hh",
		l: "h",
		M: "mm",
		S: "ss",
		p: "a",
		a: "EEE",
		A: "EEEE",
		b: "MMM",
		h: "MMM",
		B: "MMMM",
		"%": "%",
	},
	composite: {
		D: "MM/dd/yy",
		F: "yyyy-MM-dd",
		R: "HH:mm",
		T: "HH:mm:ss",
		r: "hh:mm:ss a",
	},
	zone: { 0: "xx", 1: "xxx" },
	literal: datefnsLiteral,
	placeholder: datefnsLiteral,
};

function lookup(target: TranslateTarget, token: DirectiveToken): string | undefined {
	if (token.conversion === "z") return target.zone[token.colons];
	const composite = target.composite[token.conversion];
	if (composite !== undefined) return composite;
	return target.atomic[token.conversion];
}

function buildTranslate(target: TranslateTarget, tokens: Token[]): Snippet {
	const unmapped: string[] = [];
	let pattern = "";
	for (const token of tokens) {
		if (token.kind !== "directive") {
			pattern += target.literal(token.raw);
			continue;
		}
		const mapped = lookup(target, token);
		if (mapped === undefined) {
			unmapped.push(token.raw);
			pattern += target.placeholder(token.raw);
		} else {
			pattern += mapped;
		}
	}
	return {
		id: target.id,
		label: target.label,
		lang: target.lang,
		code: target.wrap(pattern),
		caveats: caveat("unmapped", unmapped),
	};
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

/**
 * Build the ordered list of code snippets for a strftime format string.
 *
 * @param format - Current strftime format
 * @returns One snippet per target language, each with its caveats
 */
export function generateSnippets(format: string): Snippet[] {
	const tokens = tokenize(format);
	return [
		buildPassthrough(PYTHON, format, tokens),
		buildTranslate(DATEFNS, tokens),
		buildTranslate(GO, tokens),
		buildPassthrough(RUBY, format, tokens),
		buildPassthrough(SHELL, format, tokens),
		buildPassthrough(C, format, tokens),
	];
}
