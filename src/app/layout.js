import { Mulish, Quicksand, Tajawal } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

// Same trio as the Hukum marketplace: Mulish body, Quicksand headings and numbers, Tajawal Arabic.
const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata = {
  title: "Hukum for suppliers",
  description: "Sell to buyers across Saudi Arabia on Hukum",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" data-theme="light" suppressHydrationWarning>
      <body className={`${mulish.variable} ${quicksand.variable} ${tajawal.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
