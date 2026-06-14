"use client";

import { useTranslations } from "next-intl";

import { DIALECTS, type Directive } from "@/data/directives";
import { cn } from "@/lib/utils";

interface DialectSupportProps {
	directive: Directive;
	className?: string;
}

const SHORT_LABELS: Record<string, string> = { glibc: "C", python: "Py", ruby: "Rb" };

/**
 * Compact per-dialect availability badges (C, Py, Rb) for one directive.
 * Dialects that do not implement the directive are rendered muted.
 *
 * @param directive - Directive whose dialect support is shown
 * @param className - Extra classes merged onto the wrapper
 */
export function DialectSupport({ directive, className }: DialectSupportProps) {
	const t = useTranslations("dialects");

	return (
		<span className={cn("inline-flex items-center gap-1", className)}>
			{DIALECTS.map((dialect) => {
				const supported = directive[dialect];
				return (
					<span
						key={dialect}
						title={t(dialect)}
						className={cn(
							"rounded-sm border px-1 font-mono text-[10px] font-bold leading-4",
							supported
								? "bg-accent text-accent-foreground"
								: "border-dashed text-muted-foreground line-through opacity-60",
						)}
					>
						<span aria-hidden="true">{SHORT_LABELS[dialect]}</span>
						<span className="sr-only">
							{t(supported ? "supported" : "unsupported", { dialect: t(dialect) })}
						</span>
					</span>
				);
			})}
		</span>
	);
}
