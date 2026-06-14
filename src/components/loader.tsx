/**
 * Arcade-style brutalist loader, shared by the route loading screen and the
 * pre-hydration overlay. Deliberately translation-free so it renders instantly.
 */
export function ArcadeLoader() {
	return (
		<div role="status" className="flex flex-col items-center justify-center gap-8">
			<span
				aria-hidden="true"
				className="grid size-16 -rotate-3 animate-bounce place-items-center rounded-md border-2 bg-primary font-mono text-4xl font-black text-primary-foreground shadow-raised"
			>
				%
			</span>
			<p className="flex font-mono text-xl font-black tracking-[0.4em]" aria-label="Loading">
				{[..."LOADING"].map((letter, index) => (
					<span
						key={index}
						aria-hidden="true"
						className="animate-blink"
						style={{ animationDelay: `${index * 110}ms` }}
					>
						{letter}
					</span>
				))}
			</p>
			<div aria-hidden="true" className="flex gap-1.5">
				{Array.from({ length: 10 }).map((_, index) => (
					<span
						key={index}
						className="size-3 animate-blink border-2 bg-primary"
						style={{ animationDelay: `${index * 110}ms` }}
					/>
				))}
			</div>
		</div>
	);
}
