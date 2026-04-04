import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
	output: process.env.NODE_ENV === "production" ? "export" : undefined,
	trailingSlash: true,
	images: { unoptimized: true },
	// Pin the workspace root so stray lockfiles in parent directories are ignored
	turbopack: { root: process.cwd() },
};

export default withNextIntl(nextConfig);
