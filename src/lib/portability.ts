/*
 * Portability linter: flags directives that are not portable across the glibc,
 * Python and Ruby dialects. Two layers:
 *  - Conversion support comes from the directive catalog (the glibc/python/ruby
 *    booleans on each Directive).
 *  - Flag / width / modifier support is not in the catalog, so it lives here in
 *    DIALECT_CAPS, reviewed against the three man pages.
 */

import { type Dialect, DIALECTS, findDirective } from "@/data/directives";
import { type DirectiveToken, tokenize } from "@/lib/strftime";

export type PortabilityReason = "conversion" | "flag" | "width" | "modifier";

export interface TokenPortability {
	ok: boolean;
	reason?: PortabilityReason;
}

export interface PortabilityIssue {
	index: number;
	code: string;
	reason: PortabilityReason;
}

export interface FormatPortability {
	perDialect: Record<Dialect, { ok: boolean; issues: PortabilityIssue[] }>;
}

interface DialectCaps {
	padding: boolean;
	casing: boolean;
	width: boolean;
	modifiers: boolean;
}

// How each dialect honors the strftime flag groups (- _ 0, ^ #, field width and
// the E/O modifiers). Reviewed against man 3 strftime, the Python format-codes
// table and the Ruby strftime reference.
export const DIALECT_CAPS: Record<Dialect, DialectCaps> = {
	glibc: { padding: true, casing: true, width: true, modifiers: true },
	python: { padding: false, casing: false, width: false, modifiers: false },
	ruby: { padding: true, casing: true, width: true, modifiers: false },
};

// First (most severe) portability problem of a directive in one dialect, if any
function reasonFor(token: DirectiveToken, dialect: Dialect): PortabilityReason | undefined {
	const directive = findDirective(token.conversion, token.colons);
	// Unknown to the catalog (e.g. %n, %t, %%) counts as universally portable
	if (directive && !directive[dialect]) return "conversion";
	const caps = DIALECT_CAPS[dialect];
	if (token.padding && !caps.padding) return "flag";
	if (token.casing && !caps.casing) return "flag";
	if (token.width !== undefined && !caps.width) return "width";
	if (token.modifier && !caps.modifiers) return "modifier";
	return undefined;
}

/**
 * Per-dialect portability verdict for a single directive token.
 *
 * @param token - Parsed directive token
 * @returns Verdict (and first failing reason) for each dialect
 */
export function analyzeToken(token: DirectiveToken): Record<Dialect, TokenPortability> {
	const result = {} as Record<Dialect, TokenPortability>;
	for (const dialect of DIALECTS) {
		const reason = reasonFor(token, dialect);
		result[dialect] = reason ? { ok: false, reason } : { ok: true };
	}
	return result;
}

/**
 * Portability verdict for a whole format string, per dialect, with the list of
 * offending directives (their index and code).
 *
 * @param format - strftime format string
 * @returns Per-dialect ok flag and the issues that broke it
 */
export function analyzeFormat(format: string): FormatPortability {
	const perDialect: FormatPortability["perDialect"] = {
		glibc: { ok: true, issues: [] },
		python: { ok: true, issues: [] },
		ruby: { ok: true, issues: [] },
	};

	tokenize(format).forEach((token, index) => {
		if (token.kind !== "directive") return;
		for (const dialect of DIALECTS) {
			const reason = reasonFor(token, dialect);
			if (reason) {
				perDialect[dialect].ok = false;
				perDialect[dialect].issues.push({ index, code: token.raw, reason });
			}
		}
	});

	return { perDialect };
}
