"use client";

import { Check, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DIALECTS } from "@/data/directives";
import { analyzeFormat } from "@/lib/portability";
import { cn } from "@/lib/utils";

const SHORT_LABELS: Record<string, string> = { glibc: "C", python: "Py", ruby: "Rb" };

interface PortabilityBarProps {
	format: string;
}

/**
 * Compact per-dialect portability verdict (C / Py / Rb) for the whole format.
 * Each badge is ok or shows its issue count, with a tooltip listing the
 * offending directives. Complements the per-chip warnings, which only fire for
 * the selected dialect.
 *
 * @param format - Current strftime format string
 */
export function PortabilityBar({ format }: PortabilityBarProps) {
	const t = useTranslations("portability");
	const tDialects = useTranslations("dialects");
	const { perDialect } = useMemo(() => analyzeFormat(format), [format]);

	return (
		<div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
			<span className="font-black tracking-wider text-muted-foreground uppercase">
				{t("title")}
			</span>
			{DIALECTS.map((dialect) => {
				const { ok, issues } = perDialect[dialect];
				return (
					<Tooltip key={dialect}>
						<TooltipTrigger asChild>
							<span
								className={cn(
									"inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono font-bold",
									ok
										? "bg-accent text-accent-foreground"
										: "border-destructive text-destructive",
								)}
							>
								{ok ? (
									<Check aria-hidden="true" className="size-3" />
								) : (
									<TriangleAlert aria-hidden="true" className="size-3" />
								)}
								{SHORT_LABELS[dialect]}
								{!ok && <span>{issues.length}</span>}
							</span>
						</TooltipTrigger>
						<TooltipContent className="max-w-[min(20rem,calc(100vw-2rem))]">
							{ok ? (
								t("portable", { dialect: tDialects(dialect) })
							) : (
								<ul className="flex flex-col gap-0.5">
									{issues.map((issue) => (
										<li key={issue.index}>
											<span className="font-mono font-bold">
												{issue.code}
											</span>{" "}
											— {t(`reasons.${issue.reason}`)}
										</li>
									))}
								</ul>
							)}
						</TooltipContent>
					</Tooltip>
				);
			})}
		</div>
	);
}
