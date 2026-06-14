const COUNTRY_FLAGS: Record<string, string> = {
  alemanha: "🇩🇪",
  argentina: "🇦🇷",
  brasil: "🇧🇷",
  espanha: "🇪🇸",
  franca: "🇫🇷",
  frança: "🇫🇷",
  haiti: "🇭🇹",
  marrocos: "🇲🇦",
  portugal: "🇵🇹"
};

function normalizeCountry(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function countryFlag(country: string) {
  return COUNTRY_FLAGS[normalizeCountry(country)] ?? "";
}

export function countryWithFlag(country: string) {
  const flag = countryFlag(country);
  return flag ? `${flag} ${country}` : country;
}
