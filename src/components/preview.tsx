"use client";

import { CalendarClock, Copy, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { strftime } from "@/lib/strftime";
import { cn } from "@/lib/utils";

const PREVIEW_LOCALES = [
	"en-US",
	"en-GB",
	"fr-FR",
	"de-DE",
	"es-ES",
	"it-IT",
	"pt-BR",
	"nl-NL",
	"sv-SE",
	"pl-PL",
	"tr-TR",
	"ru-RU",
	"ja-JP",
	"zh-CN",
	"ko-KR",
];

interface PreviewProps {
	format: string;
	date: Date | null;
	isLive: boolean;
	onCustomDate: (date: Date | null) => void;
	previewLocale: string;
	onPreviewLocaleChange: (locale: string) => void;
	locale: string;
	onPauseChange: (paused: boolean) => void;
}

// Format a date for a datetime-local input, in local time
function toInputValue(date: Date): string {
	const p = (n: number) => String(n).padStart(2, "0");
	const ymd = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
	return `${ymd}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

/**
 * Live preview of the formatted output with date and locale controls.
 * Toggles between the running clock and a frozen custom date.
 *
 * @param format - strftime format string to render
 * @param date - Date to format, null before hydration
 * @param isLive - Whether the clock is currently running
 * @param onCustomDate - Sets or clears the frozen custom date
 * @param previewLocale - Selected preview locale identifier
 * @param onPreviewLocaleChange - Changes the preview locale
 * @param locale - Resolved locale passed to the engine
 * @param onPauseChange - Reports when a dropdown pauses the clock
 */
export function Preview({
	format,
	date,
	isLive,
	onCustomDate,
	previewLocale,
	onPreviewLocaleChange,
	locale,
	onPauseChange,
}: PreviewProps) {
	const t = useTranslations("preview");

	const output = date && format ? strftime(date, format, locale) : "";

	const copyResult = async () => {
		await navigator.clipboard.writeText(output);
		toast(t("copiedResult"));
	};

	return (
		<section className="flex flex-col gap-4 rounded-xl border-2 bg-card p-4 shadow-raised sm:p-6">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className="inline-flex items-center gap-3 text-xs font-black tracking-wider uppercase">
					{t("title")}
					{isLive && (
						<span className="inline-flex items-center gap-1.5 rounded-sm border bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground normal-case">
							<span
								aria-hidden="true"
								className="size-1.5 animate-pulse rounded-full bg-accent-foreground"
							/>
							{t("live")}
						</span>
					)}
				</h2>
				<div className="flex flex-wrap gap-1.5">
					<Popover
						onOpenChange={(open) => {
							// Freeze the clock while the picker is open so the
							// controlled input stops changing under the cursor
							if (open && isLive && date) {
								onCustomDate(date);
							}
						}}
					>
						<PopoverTrigger asChild>
							<Button variant="outline" size="sm">
								<CalendarClock className="size-4" />
								{t("pickDate")}
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="flex w-72 flex-col gap-3">
							<Label htmlFor="custom-date" className="text-xs">
								{t("pickDate")}
							</Label>
							<Input
								id="custom-date"
								type="datetime-local"
								step={1}
								className="font-mono"
								value={date ? toInputValue(date) : ""}
								onChange={(e) => {
									const next = new Date(e.target.value);
									if (!Number.isNaN(next.getTime())) {
										onCustomDate(next);
									}
								}}
							/>
							<Button
								variant="secondary"
								size="sm"
								disabled={isLive}
								onClick={() => onCustomDate(null)}
							>
								<RotateCcw className="size-4" />
								{t("backToNow")}
							</Button>
						</PopoverContent>
					</Popover>
					<Select
						value={previewLocale}
						onValueChange={onPreviewLocaleChange}
						onOpenChange={onPauseChange}
					>
						<SelectTrigger size="sm" aria-label={t("locale")}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="C">{t("cLocale")}</SelectItem>
							<SelectItem value="browser">{t("browserLocale")}</SelectItem>
							<SelectSeparator />
							{PREVIEW_LOCALES.map((tag) => (
								<SelectItem key={tag} value={tag} className="font-mono">
									{tag}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						variant="outline"
						size="sm"
						onClick={copyResult}
						disabled={!output}
						aria-label={t("copyResult")}
					>
						<Copy className="size-4" />
						{t("copyResult")}
					</Button>
				</div>
			</div>
			<output
				htmlFor="format-input"
				className={cn(
					"flex min-h-16 items-center rounded-lg border-2 bg-muted p-5 font-mono text-xl sm:text-2xl",
					!output && "text-muted-foreground",
				)}
			>
				<span className="w-full break-all whitespace-pre-wrap">{output || " "}</span>
			</output>
		</section>
	);
}
