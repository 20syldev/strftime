"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { SWATCH_CLASSES } from "@/components/chip";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
	CATEGORY_ORDER,
	CATEGORY_SWATCH,
	type Dialect,
	DIALECTS,
	type Directive,
	DIRECTIVES,
} from "@/data/directives";
import { renderToken, tokenize } from "@/lib/strftime";
import { cn } from "@/lib/utils";

interface PaletteProps {
	onInsert: (code: string) => void;
	date: Date | null;
	locale: string;
	dialect: Dialect | "all";
	onDialectChange: (dialect: Dialect | "all") => void;
	onPauseChange: (paused: boolean) => void;
}

/**
 * Grid of directive swatches grouped by category, with a dialect filter.
 *
 * @param onInsert - Appends a directive code to the format
 * @param date - Preview date for live swatch values, null before hydration
 * @param locale - Preview locale ("C" or a BCP 47 tag)
 * @param dialect - Active dialect filter, or "all"
 * @param onDialectChange - Changes the dialect filter
 * @param onPauseChange - Reports when the dialect dropdown pauses the clock
 */
export function Palette({
	onInsert,
	date,
	locale,
	dialect,
	onDialectChange,
	onPauseChange,
}: PaletteProps) {
	const t = useTranslations("palette");
	const tDir = useTranslations("directives");
	const tCat = useTranslations("categories");
	const tDialects = useTranslations("dialects");
	const [query, setQuery] = useState("");

	const matches = (directive: Directive) => {
		if (dialect !== "all" && !directive[dialect]) {
			return false;
		}
		const q = query.trim().toLowerCase();
		if (!q) {
			return true;
		}
		return (
			directive.code.toLowerCase().includes(q) ||
			tDir(`${directive.key}.description`).toLowerCase().includes(q)
		);
	};

	const visible = DIRECTIVES.filter(matches);

	return (
		<aside className="flex flex-col gap-4 rounded-xl border-2 bg-card p-4 shadow-raised lg:sticky lg:top-20 lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto">
			<div className="flex items-center justify-between gap-2">
				<h2 className="text-xs font-black tracking-wider uppercase">{t("title")}</h2>
				<Select
					value={dialect}
					onValueChange={(v) => onDialectChange(v as Dialect | "all")}
					onOpenChange={onPauseChange}
				>
					<SelectTrigger size="sm" aria-label={t("dialect")}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("all")}</SelectItem>
						{DIALECTS.map((d) => (
							<SelectItem key={d} value={d}>
								{tDialects(d)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<Input
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder={t("searchPlaceholder")}
				autoComplete="off"
				className="h-9"
			/>
			{visible.length === 0 && (
				<p className="text-sm text-muted-foreground">{t("noResults")}</p>
			)}
			<div className="gap-x-4 columns-1 sm:columns-2 lg:columns-1">
				{CATEGORY_ORDER.map((category) => {
					const directives = visible.filter((d) => d.category === category);
					if (directives.length === 0) {
						return null;
					}
					return (
						<div key={category} className="mb-4 flex break-inside-avoid flex-col gap-2">
							<h3 className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">
								{tCat(category)}
							</h3>
							<div className="flex flex-wrap gap-1.5">
								{directives.map((directive) => (
									<Tooltip key={directive.key}>
										<TooltipTrigger asChild>
											<button
												type="button"
												onClick={() => onInsert(directive.code)}
												aria-label={t("add", { code: directive.code })}
												className={cn(
													"rounded-md border-2 px-2 py-1 font-mono text-sm font-bold",
													"shadow-raised-sm transition-all hover:shadow-raised",
													"active:translate-x-(--press-x) active:translate-y-(--press-y) active:shadow-pressed",
													SWATCH_CLASSES[
														CATEGORY_SWATCH[directive.category]
													],
													"text-swatch-foreground",
												)}
											>
												{directive.code}
											</button>
										</TooltipTrigger>
										<TooltipContent side="top" className="max-w-64">
											{date && (
												<p className="font-mono text-xs font-bold whitespace-pre-wrap">
													{renderToken(
														tokenize(directive.code)[0],
														date,
														locale,
													)}
												</p>
											)}
											<p>{tDir(`${directive.key}.description`)}</p>
										</TooltipContent>
									</Tooltip>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</aside>
	);
}
