import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/providers/provider";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cert Dashboard",
  description: "",
  icons: {
    icon: `${process.env.NEXT_BACK_URL}/logo/logo.png`,
  },
};;


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={cn(
        "h-full",
        "antialiased",
        montserrat.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="min-h-full">
        <Toaster/>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
