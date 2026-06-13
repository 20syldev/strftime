"use client";

import { Copy, LayoutGrid, List, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { DialectSupport } from "@/components/support";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORY_ORDER, type Directive, DIRECTIVES } from "@/data/directives";
import { renderToken, tokenize } from "@/lib/strftime";

type ViewMode = "detailed" | "compact";

interface ReferenceProps {
	onInsert: (code: string) => void;
	date: Date | null;
	locale: string;
}

// Make newlines and tabs visible in table output cells
function escapeInvisible(value: string): string {
	return value.replace(/\n/g, "\\n").replace(/\t/g, "\\t");
}

/**
 * Searchable reference table of every directive, in detailed or compact view.
 *
 * @param onInsert - Appends a directive code to the format
 * @param date - Preview date for example output, null before hydration
 * @param locale - Preview locale ("C" or a BCP 47 tag)
 */
export function Reference({ onInsert, date, locale }: ReferenceProps) {
	const t = useTranslations("reference");
	const tDir = useTranslations("directives");
	const tCat = useTranslations("categories");
	const tPalette = useTranslations("palette");
	const [query, setQuery] = useState("");
	const [view, setView] = useState<ViewMode>("detailed");

	const matches = (directive: Directive) => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return true;
		}
		return (
			directive.code.toLowerCase().includes(q) ||
			tDir(`${directive.key}.description`).toLowerCase().includes(q) ||
			tDir(`${directive.key}.notes`).toLowerCase().includes(q)
		);
	};

	const liveValue = (directive: Directive) =>
		date ? escapeInvisible(renderToken(tokenize(directive.code)[0], date, locale)) : "";

	const copyCode = async (code: string) => {
		await navigator.clipboard.writeText(code);
		toast(t("copied", { code }));
	};

	const actions = (directive: Directive, compact: boolean) => (
		<div className={compact ? "flex gap-0.5" : "flex gap-1 max-sm:order-2"}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className={compact ? "size-7" : undefined}
						aria-label={tPalette("add", { code: directive.code })}
						onClick={() => onInsert(directive.code)}
					>
						<Plus className={compact ? "size-3.5" : "size-4"} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>{t("insert")}</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className={compact ? "size-7" : undefined}
						aria-label={t("copy")}
						onClick={() => copyCode(directive.code)}
					>
						<Copy className={compact ? "size-3.5" : "size-4"} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>{t("copy")}</TooltipContent>
			</Tooltip>
		</div>
	);

	return (
		<section className="flex flex-col gap-4" id="reference">
			<header className="flex flex-col gap-1">
				<h2 className="text-2xl font-black tracking-tight">{t("title")}</h2>
				<p className="text-sm text-muted-foreground">{t("subtitle")}</p>
			</header>
			<div className="flex items-center gap-2">
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={t("searchPlaceholder")}
					autoComplete="off"
					className="min-w-0 flex-1"
				/>
				<ToggleGroup
					type="single"
					variant="outline"
					value={view}
					onValueChange={(value) => value && setView(value as ViewMode)}
					aria-label={t("view")}
					className="shrink-0"
				>
					<ToggleGroupItem value="detailed" aria-label={t("viewDetailed")}>
						<List className="size-4" />
					</ToggleGroupItem>
					<ToggleGroupItem value="compact" aria-label={t("viewCompact")}>
						<LayoutGrid className="size-4" />
					</ToggleGroupItem>
				</ToggleGroup>
			</div>
			{CATEGORY_ORDER.map((category) => {
				const rows = DIRECTIVES.filter((d) => d.category === category && matches(d));
				if (rows.length === 0) {
					return null;
				}
				if (view === "compact") {
					return (
						<div key={category} className="flex flex-col gap-2">
							<h3 className="px-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">
								{tCat(category)}
							</h3>
							<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
								{rows.map((directive) => (
									<div
										key={directive.key}
										className="flex flex-col gap-1.5 rounded-lg border-2 bg-card p-2.5 shadow-raised-sm"
									>
										<div className="flex items-center justify-between gap-1">
											<span className="font-mono text-sm font-black">
												{directive.code}
											</span>
											{actions(directive, true)}
										</div>
										<span className="min-h-4 font-mono text-xs break-all whitespace-pre-wrap text-muted-foreground">
											{liveValue(directive)}
										</span>
										<p className="text-sm">
											{tDir(`${directive.key}.description`)}
										</p>
										<p className="text-xs text-muted-foreground">
											{tDir(`${directive.key}.notes`)}
										</p>
										<div className="mt-auto flex flex-wrap items-center gap-2">
											<DialectSupport directive={directive} />
											{directive.range && (
												<Badge variant="outline" className="font-mono">
													{directive.range}
												</Badge>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					);
				}
				return (
					<div
						key={category}
						className="overflow-hidden rounded-xl border-2 bg-card shadow-raised"
					>
						<h3 className="border-b-2 bg-muted px-4 py-2 text-xs font-black tracking-wider uppercase">
							{tCat(category)}
						</h3>
						<ul className="divide-y">
							{rows.map((directive) => (
								<li
									key={directive.key}
									className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[5rem_minmax(7rem,9rem)_1fr_auto] sm:items-baseline"
								>
									<span className="font-mono text-sm font-black">
										{directive.code}
									</span>
									<span className="font-mono text-sm break-all whitespace-pre-wrap text-muted-foreground max-sm:order-3 max-sm:col-span-2">
										{liveValue(directive)}
									</span>
									<div className="flex flex-col gap-1 max-sm:order-4 max-sm:col-span-2">
										<p className="text-sm">
											{tDir(`${directive.key}.description`)}
										</p>
										<p className="text-xs text-muted-foreground">
											{tDir(`${directive.key}.notes`)}
										</p>
										<div className="flex flex-wrap items-center gap-2">
											<DialectSupport directive={directive} />
											{directive.range && (
												<Badge variant="outline" className="font-mono">
													{directive.range}
												</Badge>
											)}
										</div>
									</div>
									{actions(directive, false)}
								</li>
							))}
						</ul>
					</div>
				);
			})}
			<Modifiers />
		</section>
	);
}

const MODIFIER_ROWS = [
	{ flag: "-", key: "dash" },
	{ flag: "_", key: "underscore" },
	{ flag: "0", key: "zero" },
	{ flag: "^", key: "caret" },
	{ flag: "#", key: "hash" },
	{ flag: "1..9", key: "widthText" },
	{ flag: ":", key: "colon" },
] as const;

function Modifiers() {
	const t = useTranslations("reference.modifiers");

	return (
		<div className="overflow-hidden rounded-xl border-2 bg-card shadow-raised">
			<h3 className="border-b-2 bg-muted px-4 py-2 text-xs font-black tracking-wider uppercase">
				{t("title")}
			</h3>
			<div className="flex flex-col gap-3 px-4 py-3">
				<p className="text-sm">{t("intro")}</p>
				<ul className="flex flex-col gap-1.5">
					{MODIFIER_ROWS.map(({ flag, key }) => (
						<li key={key} className="flex items-baseline gap-3 text-sm">
							<span className="w-12 shrink-0 text-right font-mono font-black">
								{flag}
							</span>
							<span>{t(key)}</span>
						</li>
					))}
				</ul>
				<p className="text-xs text-muted-foreground">{t("python")}</p>
			</div>
		</div>
	);
}
