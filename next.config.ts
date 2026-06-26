import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
	output: process.env.NODE_ENV === "production" ? "export" : undefined,
	trailingSlash: true,
	images: { unoptimized: true },
	turbopack: { root: process.cwd() },
	experimental: { globalNotFound: true },
};

export default withNextIntl(nextConfig);
