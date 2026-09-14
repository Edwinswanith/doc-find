import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Doc+Find Prototype",
    short_name: "Doc+Find",
    description: "Local healthcare staffing workflow prototype",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F8FC",
    theme_color: "#2457D6",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  }
}
