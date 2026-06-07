import Link from "next/link";
import type { ComponentType, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import type { LucideProps } from "lucide-react";

export function PageShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">{children}</main>;
}

export function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-4">
      {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.18em] text-brasil-green">{eyebrow}</p> : null}
      <h2 className="text-2xl font-black text-brasil-navy md:text-3xl">{title}</h2>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "green"
}: {
  label: string;
  value: string;
  icon: ComponentType<LucideProps>;
  tone?: "green" | "yellow" | "blue";
}) {
  const tones = {
    green: "bg-brasil-green text-white",
    yellow: "bg-brasil-yellow text-brasil-navy",
    blue: "bg-brasil-blue text-white"
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-field">
      <div className={`mb-3 grid h-11 w-11 place-items-center rounded-full ${tones[tone]}`}>
        <Icon size={22} aria-hidden />
      </div>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-brasil-navy">{value}</p>
    </div>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-brasil-yellow px-6 py-2.5 text-center font-black text-brasil-navy shadow-field transition hover:-translate-y-0.5"
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-white px-6 py-2.5 text-center font-black text-white"
    >
      {children}
    </Link>
  );
}

export function Field(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-brasil-navy shadow-field outline-none focus:border-brasil-green"
    />
  );
}

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-brasil-navy shadow-field outline-none focus:border-brasil-green"
    />
  );
}

export function FormPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-md rounded-lg bg-white p-5 shadow-field md:p-7">
      <h1 className="mb-5 text-3xl font-black text-brasil-navy">{title}</h1>
      {children}
    </section>
  );
}
