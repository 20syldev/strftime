"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

const getServerSnapshot = () => null;

/**
 * Ticking clock that stays null until the component is mounted, so server
 * and client markup never disagree on the current time.
 *
 * @param intervalMs - Tick interval in milliseconds
 * @param enabled - When false, the clock is read once on mount and frozen
 * @returns The current date, or null before hydration
 */
export function useNow(intervalMs: number, enabled: boolean): Date | null {
	const latest = useRef<Date | null>(null);

	const subscribe = useCallback(
		(onChange: () => void) => {
			// Initial post-mount tick; notifying right away avoids a blank
			// frame until the first interval fires
			latest.current = new Date();
			onChange();
			if (!enabled) {
				return () => {};
			}
			const id = window.setInterval(() => {
				latest.current = new Date();
				onChange();
			}, intervalMs);
			return () => window.clearInterval(id);
		},
		[intervalMs, enabled],
	);

	const getSnapshot = useCallback(() => latest.current, []);

	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
