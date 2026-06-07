import Link from "next/link";
import { Field, FormPanel, PageShell } from "@/components/ui";
import { nextBrazilMatch } from "@/data/next-match";

export default function CadastroPage() {
  return (
    <PageShell>
      <FormPanel title="Criar cadastro">
        <p className="mb-5 rounded-lg bg-brasil-light p-3 text-sm font-bold text-brasil-navy">
          Cadastre-se para participar de {nextBrazilMatch.homeTeam} x {nextBrazilMatch.awayTeam}.
        </p>
        <form className="grid gap-4">
          <Field placeholder="Nome completo" name="name" />
          <Field placeholder="Telefone / WhatsApp" name="phone" inputMode="tel" />
          <Field placeholder="Senha" name="password" type="password" />
          <Field placeholder="Confirmar senha" name="confirmPassword" type="password" />
          <Link
            href={`/jogos/${nextBrazilMatch.id}`}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-brasil-green px-5 text-center font-black text-white shadow-field"
          >
            Cadastrar e continuar
          </Link>
        </form>
        <p className="mt-5 text-center text-sm font-semibold text-slate-600">
          Ja tem conta? <Link className="font-black text-brasil-blue" href="/login">Entrar e continuar</Link>
        </p>
      </FormPanel>
    </PageShell>
  );
}
