import type { NextConfig } from "next";
import { BLOB_HOST_WILDCARD, blobHostname } from "./src/lib/blob-host";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Only our own photo store (falls back to any Vercel Blob host if the
        // store can't be worked out at build time).
        protocol: "https",
        hostname: blobHostname() ?? BLOB_HOST_WILDCARD,
        pathname: "/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
