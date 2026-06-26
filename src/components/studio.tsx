"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Builder } from "@/components/builder";
import { CommandMenu } from "@/components/command";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ArcadeLoader } from "@/components/loader";
import { Palette } from "@/components/palette";
import { Presets } from "@/components/presets";
import { Preview } from "@/components/preview";
import { Reference } from "@/components/reference";
import { TooltipProvider } from "@/components/ui/tooltip";
import { type Dialect } from "@/data/directives";
import { useNow } from "@/hooks/useNow";

const DEFAULT_FORMAT = "%Y-%m-%d %H:%M:%S";

/**
 * Client root of the studio: owns the format string, preview date, locale
 * and dialect state, and wires them across the builder, palette and reference.
 */
export function Studio() {
	const t = useTranslations("hero");

	// Seed from ?f= on the client; the server has no URL and uses the default,
	// which is safe because the booting gate renders no format-dependent markup
	// on the first paint, so there is nothing to mismatch on hydration.
	const [format, setFormat] = useState(() =>
		typeof window === "undefined"
			? DEFAULT_FORMAT
			: (new URLSearchParams(window.location.search).get("f") ?? DEFAULT_FORMAT),
	);
	const [customDate, setCustomDate] = useState<Date | null>(null);
	const [previewLocale, setPreviewLocale] = useState("browser");
	const [dialect, setDialect] = useState<Dialect | "all">("all");
	const [searchOpen, setSearchOpen] = useState(false);
	const [uiPaused, setUiPaused] = useState(false);

	const now = useNow(1000, customDate === null && !uiPaused);
	const date = customDate ?? now;

	// Keep the arcade loader up until the clock is live, with a minimum
	// display time so fast loads do not flash it for a few frames
	const [loaderDone, setLoaderDone] = useState(false);
	useEffect(() => {
		const timer = window.setTimeout(() => setLoaderDone(true), 600);
		return () => window.clearTimeout(timer);
	}, []);
	const booting = date === null || !loaderDone;
	const resolvedLocale =
		previewLocale === "browser"
			? typeof navigator === "undefined"
				? "en-US"
				: navigator.language
			: previewLocale;

	// Mirror the format back to the URL whenever it changes
	useEffect(() => {
		const url = new URL(window.location.href);
		if (format && format !== DEFAULT_FORMAT) {
			url.searchParams.set("f", format);
		} else {
			url.searchParams.delete("f");
		}
		window.history.replaceState(null, "", url);
	}, [format]);

	const insert = (code: string) => setFormat((current) => current + code);

	// While booting, render only the loader: with no tall content behind it
	// there is nothing to scroll and no scrollbar appears. This also matches
	// the server render (booting starts true), avoiding a hydration mismatch.
	if (booting) {
		return (
			<div className="flex min-h-svh items-center justify-center bg-background">
				<ArcadeLoader />
			</div>
		);
	}

	return (
		<TooltipProvider delayDuration={250}>
			<div className="flex min-h-svh flex-col">
				<Header onSearchOpen={() => setSearchOpen(true)} />
				<main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
					<section className="flex flex-col gap-2">
						<h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
							{t("title")}
						</h1>
						<p className="max-w-2xl text-muted-foreground">{t("subtitle")}</p>
					</section>
					<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
						<div className="flex min-w-0 flex-col gap-6">
							<Builder
								format={format}
								onFormatChange={setFormat}
								date={date}
								locale={resolvedLocale}
								dialect={dialect}
							/>
							<Preview
								format={format}
								date={date}
								isLive={customDate === null}
								onCustomDate={setCustomDate}
								previewLocale={previewLocale}
								onPreviewLocaleChange={setPreviewLocale}
								locale={resolvedLocale}
								onPauseChange={setUiPaused}
							/>
							<Presets format={format} onSelect={setFormat} />
						</div>
						<Palette
							onInsert={insert}
							date={date}
							locale={resolvedLocale}
							dialect={dialect}
							onDialectChange={setDialect}
							onPauseChange={setUiPaused}
						/>
					</div>
					<Reference onInsert={insert} date={date} locale={resolvedLocale} />
				</main>
				<Footer />
				<CommandMenu
					open={searchOpen}
					onOpenChange={setSearchOpen}
					onInsert={insert}
					onPreset={setFormat}
				/>
			</div>
		</TooltipProvider>
	);
}
