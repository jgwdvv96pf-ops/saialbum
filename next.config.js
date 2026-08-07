/** @type {import('next').NextConfig} */

// Next/Image needs to allowlist the exact hostname it's allowed to
// optimize images from. We read it from R2_PUBLIC_URL at build time
// so you don't have to hardcode it here.
let r2Hostname;
try {
  r2Hostname = new URL(process.env.R2_PUBLIC_URL || "").hostname;
} catch {
  r2Hostname = undefined;
}

const nextConfig = {
  images: {
    remotePatterns: r2Hostname
      ? [{ protocol: "https", hostname: r2Hostname }]
      : [],
  },
};

module.exports = nextConfig;
