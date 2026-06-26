"use client";

import { House } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { type AppLocale, routing } from "@/i18n/routing";

export interface NotFoundCopy {
	title: string;
	description: string;
	back: string;
}

interface NotFoundProps {
	copy: Record<AppLocale, NotFoundCopy>;
}

// The 404 document never navigates, so there is nothing to subscribe to.
const subscribe = () => () => {};

// The locale is the first path segment when it is a known prefix (/fr, /es,
// ...); the default locale is served unprefixed at the root.
const getLocale = (): AppLocale => {
	const segment = window.location.pathname.split("/")[1];
	return (routing.locales as readonly string[]).includes(segment)
		? (segment as AppLocale)
		: routing.defaultLocale;
};

// Match the server HTML, which is built in the default locale.
const getServerLocale = (): AppLocale => routing.defaultLocale;

/**
 * Brutalist 404 screen, themed around the builder: a missing page reads as an
 * unknown strftime directive. Self-contained and centered, mirroring the arcade
 * loader so it stands on its own without the studio chrome around it.
 *
 * A static export serves one 404 document for every path, so the locale cannot
 * be known when the page is built. It is resolved on the client from the URL
 * prefix (/fr, /es, ...), falling back to the default locale at the root.
 *
 * @param copy - Translated title, description and back label, keyed by locale
 */
export function NotFound({ copy }: NotFoundProps) {
	const locale = useSyncExternalStore(subscribe, getLocale, getServerLocale);
	useEffect(() => {
		document.documentElement.lang = locale;
	}, [locale]);

	const t = copy[locale];
	const home = locale === routing.defaultLocale ? "/" : `/${locale}/`;

	return (
		<main className="flex min-h-svh flex-col items-center justify-center gap-8 px-4 text-center">
			<span
				aria-hidden="true"
				className="grid -rotate-3 place-items-center rounded-lg border-2 bg-primary px-5 py-2 font-mono text-5xl font-black text-primary-foreground shadow-raised-lg select-none sm:px-7 sm:text-7xl"
			>
				%404
			</span>
			<div className="flex max-w-md flex-col gap-3">
				<h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t.title}</h1>
				<p className="text-balance text-muted-foreground">{t.description}</p>
			</div>
			<Button asChild size="lg" className="font-bold">
				<a href={home}>
					<House className="size-4" />
					{t.back}
				</a>
			</Button>
			<div aria-hidden="true" className="flex gap-1.5">
				{Array.from({ length: 10 }).map((_, index) => (
					<span
						key={index}
						className="size-3 animate-blink border-2 bg-primary"
						style={{ animationDelay: `${index * 110}ms` }}
					/>
				))}
			</div>
		</main>
	);
}
