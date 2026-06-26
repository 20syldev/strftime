import Image, { type ImageProps } from "next/image";

import { cn } from "@/lib/utils";

/*
 * The brutalist "%" mark, rendered straight from the favicon (app/icon.svg) so
 * the on-screen logo and the browser-tab icon are the exact same artwork. The
 * tilt, border and offset shadow live in the SVG; here we only scale it.
 */
const SIZE_PX = { sm: 38, lg: 64 } as const;

interface LogoProps extends Omit<ImageProps, "src" | "alt" | "width" | "height"> {
	size?: keyof typeof SIZE_PX;
}

/**
 * The strftime brand mark. Decorative (the wordmark carries the name), so it is
 * hidden from assistive tech.
 *
 * @param size - Mark scale: sm (header) or lg (loader, splash)
 */
export function Logo({ size = "sm", className, ...props }: LogoProps) {
	const px = SIZE_PX[size];
	return (
		<Image
			src="/icon.svg"
			alt=""
			aria-hidden="true"
			width={px}
			height={px}
			draggable={false}
			loading="eager"
			className={cn("select-none", className)}
			{...props}
		/>
	);
}
