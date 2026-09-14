import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Doc+Find · Healthcare staffing",
  description: "Fictional local prototype for dermatology staffing workflows",
  icons: { icon: "/icon.svg" },
}

export const viewport: Viewport = { themeColor: "#2457D6", width: "device-width", initialScale: 1 }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
