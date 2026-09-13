import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminDisposicion from "./AdminDisposicion";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LayoutAdmin({ children }: Readonly<{ children: ReactNode }>) {
  return <AdminDisposicion>{children}</AdminDisposicion>;
}
