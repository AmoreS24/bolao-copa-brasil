export function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export const cornerRanges = ["0 a 5", "6 a 8", "9 a 11", "12 a 14", "15+"];
export const cardRanges = ["0 a 2", "3 a 4", "5 a 6", "7+"];
