/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  onDemandStaticRevalidation: {
    allowQueryParameters: ["tk"],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  RelGeneration: {
    normal: {
      prerenderErrorStack: "hidden",
      prerenderWithRenderToString: true,
      tryIncrementalPrerender: true,
    },
  },
}

export default nextConfig