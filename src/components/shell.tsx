import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { type AbstractIntlMessages, NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { type AppLocale } from "@/i18n/routing";

import "@/app/globals.css";

const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-jetbrains-mono",
});

interface ShellProps {
	locale: AppLocale;
	messages: AbstractIntlMessages;
	children: ReactNode;
}

/**
 * Shared root document for every locale: html lang, display and mono fonts,
 * theme and intl providers. Each locale route group renders this with its own
 * messages so the default locale can live at "/" and the others under a prefix.
 *
 * @param locale - Active locale, used for the html lang attribute
 * @param messages - Translated messages handed to the client provider
 * @param children - Page tree for this locale
 */
export function Shell({ locale, messages, children }: ShellProps) {
	return (
		<html lang={locale} suppressHydrationWarning>
			<body
				className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
				suppressHydrationWarning
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<NextIntlClientProvider locale={locale} messages={messages}>
						{children}
					</NextIntlClientProvider>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
