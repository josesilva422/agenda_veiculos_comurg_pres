"use client";
import { SessionProvider } from "next-auth/react";
import RegistrarSW from "@/components/RegistrarSW";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RegistrarSW />
      {children}
    </SessionProvider>
  );
}
