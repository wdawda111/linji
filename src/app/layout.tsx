import type { Metadata, Viewport } from "next";
import { getCurrentUser, toUserDTO } from "@/lib/session";
import { SessionProvider } from "@/components/session-provider";
import { ToastProvider } from "@/components/toast";
import { SITE_NAME } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  title: `邻集 · ${SITE_NAME}`,
  description: "每个小区、楼栋或办公室独立运行的闲置物品流转工具",
};

export const viewport: Viewport = {
  themeColor: "#fbfafe",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const current = await getCurrentUser();

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        <ToastProvider>
        <SessionProvider initialCurrent={current ? toUserDTO(current) : null}>
            {children}
          </SessionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
