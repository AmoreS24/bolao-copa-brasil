import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Gauge, Headphones, Home, Medal, Shield, Trophy } from "lucide-react";
import Link from "next/link";
import { AuthGate } from "@/components/auth-gate";
import { ReferralCapture } from "@/components/referral-capture";
import { getCurrentUser } from "@/lib/auth";
import { isMasterUser } from "@/lib/admin";
import { SUPPORT_WHATSAPP_URL } from "@/lib/support";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bolão Jogos do Brasil",
  description: "MVP de bolao esportivo para os jogos do Brasil na Copa do Mundo."
};

const navItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/dashboard", label: "Meus Palpites", icon: Gauge },
  { href: "/ranking", label: "Ranking da Torcida", icon: Medal },
  { href: "/vencedores", label: "Vencedores", icon: Trophy },
  { href: SUPPORT_WHATSAPP_URL, label: "Suporte", icon: Headphones, external: true }
];

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = getCurrentUser();
  const isMaster = isMasterUser(user);
  const visibleNavItems = isMaster ? [...navItems, { href: "/admin", label: "Admin", icon: Shield }] : navItems;

  return (
    <html lang="pt-BR">
      <body className="min-h-screen pb-20 font-sans antialiased md:pb-0">
        <ReferralCapture />
        <header className="sticky top-0 z-30 border-b border-brasil-yellow/50 bg-white/92 shadow-[0_10px_28px_rgba(7,27,77,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex min-w-0 items-center gap-3 font-black text-brasil-blue">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brasil-yellow text-brasil-green shadow-field ring-4 ring-brasil-green/10">
                <Trophy size={22} aria-hidden />
              </span>
              <span className="truncate text-lg leading-none">Bolão Jogos do Brasil</span>
            </Link>
            <nav className="hidden items-center gap-2 rounded-full bg-brasil-light p-1 text-sm font-black text-brasil-navy md:flex">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noreferrer" : undefined}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 transition hover:bg-white hover:text-brasil-green hover:shadow-field"
                >
                  <item.icon size={16} aria-hidden />
                  {item.label}
                </Link>
              ))}
            </nav>
            <AuthGate variant="header">Entrar</AuthGate>
          </div>
        </header>
        {children}
        <nav className={`fixed inset-x-3 bottom-3 z-40 grid ${isMaster ? "grid-cols-6" : "grid-cols-5"} rounded-full border border-white/70 bg-white/95 p-1 text-[10px] font-black text-brasil-navy shadow-[0_12px_34px_rgba(7,27,77,0.2)] backdrop-blur md:hidden`}>
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              className="grid min-h-14 place-items-center gap-0.5 rounded-full hover:bg-brasil-light hover:text-brasil-green"
            >
              <item.icon size={18} aria-hidden />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </body>
    </html>
  );
}
