"use client";

import { Code2, Copy, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateSnippets, type Snippet } from "@/lib/codegen";

interface CodeExportProps {
	format: string;
}

/**
 * Dialog that turns the current format into ready-to-paste snippets for several
 * languages, one tab each, with per-language portability caveats.
 *
 * @param format - Current strftime format string
 */
export function CodeExport({ format }: CodeExportProps) {
	const t = useTranslations("codegen");
	const snippets = useMemo(() => generateSnippets(format), [format]);

	const copy = async (snippet: Snippet) => {
		await navigator.clipboard.writeText(snippet.code);
		toast(t("copied", { lang: snippet.label }));
	};

	return (
		<Dialog>
			<Tooltip>
				<TooltipTrigger asChild>
					<DialogTrigger asChild>
						<Button variant="outline" size="icon" aria-label={t("title")}>
							<Code2 className="size-4" />
						</Button>
					</DialogTrigger>
				</TooltipTrigger>
				<TooltipContent>{t("title")}</TooltipContent>
			</Tooltip>
			<DialogContent className="sm:max-w-2xl" closeLabel={t("close")}>
				<DialogHeader>
					<DialogTitle>{t("title")}</DialogTitle>
					<DialogDescription>{t("description")}</DialogDescription>
				</DialogHeader>
				<Tabs defaultValue={snippets[0]?.id} className="gap-3">
					<TabsList className="flex h-auto w-full flex-wrap">
						{snippets.map((snippet) => (
							<TabsTrigger key={snippet.id} value={snippet.id}>
								{snippet.label}
							</TabsTrigger>
						))}
					</TabsList>
					{snippets.map((snippet) => (
						<TabsContent
							key={snippet.id}
							value={snippet.id}
							className="flex flex-col gap-3"
						>
							<div className="relative">
								<pre className="overflow-x-auto rounded-lg border-2 bg-muted p-4 pr-14 font-mono text-sm">
									<code>{snippet.code || " "}</code>
								</pre>
								<Button
									variant="outline"
									size="icon"
									className="absolute top-2 right-2"
									aria-label={t("copy")}
									onClick={() => copy(snippet)}
								>
									<Copy className="size-4" />
								</Button>
							</div>
							{snippet.caveats.length > 0 && (
								<ul className="flex flex-col gap-1.5">
									{snippet.caveats.map((item) => (
										<li
											key={item.reason}
											className="flex items-start gap-1.5 text-xs text-muted-foreground"
										>
											<TriangleAlert
												aria-hidden="true"
												className="mt-0.5 size-3.5 shrink-0 text-destructive"
											/>
											<span>
												{t(`caveats.${item.reason}`, {
													codes: item.codes.join(", "),
												})}
											</span>
										</li>
									))}
								</ul>
							)}
						</TabsContent>
					))}
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
