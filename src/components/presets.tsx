"use client";

import { useTranslations } from "next-intl";

import { PRESETS } from "@/data/presets";
import { cn } from "@/lib/utils";

interface PresetsProps {
	format: string;
	onSelect: (format: string) => void;
}

/**
 * Card of preset format chips in a responsive grid, highlighting the active one.
 *
 * @param format - Current format string, used to mark the active preset
 * @param onSelect - Applies the chosen preset's format
 */
export function Presets({ format, onSelect }: PresetsProps) {
	const t = useTranslations("presets");

	return (
		<section className="flex flex-col gap-4 rounded-xl border-2 bg-card p-4 shadow-raised sm:p-6">
			<h2 className="text-xs font-black tracking-wider text-muted-foreground uppercase">
				{t("title")}
			</h2>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{PRESETS.map((preset) => {
					const active = preset.format === format;
					return (
						<button
							key={preset.key}
							type="button"
							aria-pressed={active}
							onClick={() => onSelect(preset.format)}
							className={cn(
								"flex flex-col items-start gap-0.5 rounded-md border-2 px-3 py-1.5 text-left",
								"shadow-raised-sm transition-all hover:shadow-raised",
								"active:translate-x-(--press-x) active:translate-y-(--press-y) active:shadow-pressed",
								active ? "bg-primary text-primary-foreground" : "bg-card",
							)}
						>
							<span className="text-xs font-bold">{t(`names.${preset.key}`)}</span>
							<span
								className={cn(
									"font-mono text-[11px]",
									!active && "text-muted-foreground",
								)}
							>
								{preset.format}
							</span>
						</button>
					);
				})}
			</div>
		</section>
	);
}
