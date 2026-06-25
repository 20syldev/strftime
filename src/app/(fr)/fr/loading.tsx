import { ArcadeLoader } from "@/components/loader";

/**
 * Route-level loading UI for the French locale.
 * Rendered by the App Router while the segment's bundle and data resolve.
 */
export default function Loading() {
	return (
		<div className="flex min-h-svh items-center justify-center">
			<ArcadeLoader />
		</div>
	);
}
