import Link from "next/link";

const CARD_CLASS =
  "group flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-6 tablet:p-8 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-800/60 dark:hover:shadow-lg dark:focus:ring-offset-zinc-900";

const CARD_TITLE_CLASS =
  "text-2xl tablet:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50";

const CARD_DESC_CLASS = "mt-2 text-sm text-zinc-600 dark:text-zinc-400";

const CARD_LINK_CLASS =
  "mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 transition-colors group-hover:text-emerald-700 dark:text-emerald-400 dark:group-hover:text-emerald-300";

export default function DashboardPage() {
  return (
    <div className="space-y-10 tablet:space-y-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tablet:text-3xl">
          Panel de Control
        </h1>
        <p className="max-w-xl text-base text-zinc-600 dark:text-zinc-400">
          Gestiona clientes y sus servicios de agua, electricidad e internet.
        </p>
      </header>

      <section
        className="grid gap-4 grid-cols-1 tablet:grid-cols-2 tablet:gap-6 desktop:grid-cols-3 desktop:gap-6"
        aria-label="Quick links"
      >
        <Link
          href="/clients"
          className={CARD_CLASS}
          aria-label="Ver y gestionar clientes"
        >
          <span className={CARD_TITLE_CLASS} aria-hidden>
            Clientes
          </span>
          <span className={CARD_DESC_CLASS}>
            Ver y gestionar clientes y sus servicios asignados.
          </span>
          <span className={CARD_LINK_CLASS}>
            Abrir Clientes
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Link>

        <Link
          href="/services"
          className={CARD_CLASS}
          aria-label="Ver servicios"
        >
          <span className={CARD_TITLE_CLASS} aria-hidden>
            Servicios
          </span>
          <span className={CARD_DESC_CLASS}>
            Agua, Electricidad e Internet — ver quién tiene cada servicio.
          </span>
          <span className={CARD_LINK_CLASS}>
            Abrir Servicios
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Link>

        <Link
          href="/payments"
          className={CARD_CLASS}
          aria-label="Ver y gestionar pagos"
        >
          <span className={CARD_TITLE_CLASS} aria-hidden>
            Pagos
          </span>
          <span className={CARD_DESC_CLASS}>
            Ver, rastrear y gestionar todos los pagos de clientes.
          </span>
          <span className={CARD_LINK_CLASS}>
            Abrir Pagos
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Link>
      </section>
    </div>
  );
}
