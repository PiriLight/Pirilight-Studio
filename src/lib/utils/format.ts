/** Formatação de apresentação — só isto, nada de lógica de negócio aqui. */

const EUR_FORMATTER = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export function formatEuros(value: number): string {
  return EUR_FORMATTER.format(value);
}

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long" });

/** "2026-03-30" → "30 de março". Sem ano: é sempre usado para datas próximas. */
export function formatDateDisplay(isoDate: string): string {
  // Meio-dia UTC evita que o fuso do browser empurre a data para o dia anterior.
  return DATE_FORMATTER.format(new Date(`${isoDate}T12:00:00Z`));
}
