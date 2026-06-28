"use client";

import { Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type DateOrder, detectFormat } from "@/lib/detect";
import { strftime } from "@/lib/strftime";

// Regions that conventionally write the month before the day; everything else
// defaults to day-first, and the toggle lets the user override either way
const MDY_REGIONS = new Set(["US", "PH", "FM", "PW", "MH", "GU", "MP", "AS", "VI"]);

function defaultOrder(locale: string): DateOrder {
	try {
		const region = new Intl.Locale(locale).maximize().region;
		if (region && MDY_REGIONS.has(region)) {
			return "mdy";
		}
	} catch {
		// Malformed tag: fall through to the day-first default
	}
	return "dmy";
}

interface DetectProps {
	onFormatChange: (format: string) => void;
	date: Date | null;
	locale: string;
}

/**
 * Popover that infers a strftime format from a pasted example date and loads
 * it into the builder. Shows a live preview of the inferred format, an
 * order toggle when the day/month split is ambiguous, and a graceful
 * "not detected" state rather than a silent wrong guess.
 *
 * @param onFormatChange - Receives the inferred format when Apply is pressed
 * @param date - Preview date used to render the inferred format
 * @param locale - Preview locale, both for names and for the live render
 */
export function Detect({ onFormatChange, date, locale }: DetectProps) {
	const t = useTranslations("detect");
	const [open, setOpen] = useState(false);
	const [text, setText] = useState("");
	const [order, setOrder] = useState<DateOrder>(() => defaultOrder(locale));

	const result = useMemo(() => detectFormat(text, { locale, order }), [text, locale, order]);

	const typed = text.trim() !== "";
	const detected = typed && result.format !== "";
	const preview = detected && date ? strftime(date, result.format, locale) : "";

	const apply = () => {
		if (!result.format) {
			return;
		}
		onFormatChange(result.format);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<Tooltip>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<Button variant="outline" size="icon" aria-label={t("trigger")}>
							<Wand2 className="size-4" />
						</Button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent>{t("trigger")}</TooltipContent>
			</Tooltip>
			<PopoverContent align="end" className="flex w-80 flex-col gap-3">
				<PopoverHeader>
					<PopoverTitle>{t("title")}</PopoverTitle>
					<PopoverDescription>{t("description")}</PopoverDescription>
				</PopoverHeader>
				<Input
					value={text}
					onChange={(event) => setText(event.target.value)}
					placeholder={t("placeholder")}
					autoComplete="off"
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					className="font-mono"
				/>
				{result.ambiguities.includes("order") && (
					<div className="flex flex-col gap-1.5">
						<span className="text-xs text-muted-foreground">{t("ambiguous")}</span>
						<ToggleGroup
							type="single"
							variant="outline"
							value={order}
							onValueChange={(value) => value && setOrder(value as DateOrder)}
							className="w-full"
						>
							<ToggleGroupItem value="mdy" className="flex-1">
								{t("mdy")}
							</ToggleGroupItem>
							<ToggleGroupItem value="dmy" className="flex-1">
								{t("dmy")}
							</ToggleGroupItem>
						</ToggleGroup>
					</div>
				)}
				{typed && !detected && (
					<p className="text-sm text-muted-foreground">{t("notDetected")}</p>
				)}
				{detected && (
					<div className="flex flex-col gap-2">
						<div className="flex flex-col gap-1 rounded-md border-2 bg-muted/40 p-2.5">
							<code className="font-mono text-sm font-bold break-all">
								{result.format}
							</code>
							{preview && (
								<span className="font-mono text-xs break-all text-muted-foreground">
									{preview}
								</span>
							)}
						</div>
						{result.confidence < 0.5 && (
							<p className="text-xs text-muted-foreground">{t("lowConfidence")}</p>
						)}
						<Button onClick={apply} className="w-full">
							{t("apply")}
						</Button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
