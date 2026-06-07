import Link from "next/link";
import { Field, FormPanel, PageShell } from "@/components/ui";
import { nextBrazilMatch } from "@/data/next-match";

export default function LoginPage() {
  return (
    <PageShell>
      <FormPanel title="Entrar">
        <p className="mb-5 rounded-lg bg-brasil-light p-3 text-sm font-bold text-brasil-navy">
          Entre para gerar o Pix de {nextBrazilMatch.homeTeam} x {nextBrazilMatch.awayTeam}.
        </p>
        <form className="grid gap-4">
          <Field placeholder="Telefone" name="phone" inputMode="tel" />
          <Field placeholder="Senha" name="password" type="password" />
          <Link
            href={`/jogos/${nextBrazilMatch.id}`}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-brasil-blue px-5 text-center font-black text-white shadow-field"
          >
            Entrar e continuar
          </Link>
        </form>
        <p className="mt-5 text-center text-sm font-semibold text-slate-600">
          Novo por aqui? <Link className="font-black text-brasil-green" href="/cadastro">Criar conta</Link>
        </p>
      </FormPanel>
    </PageShell>
  );
}
