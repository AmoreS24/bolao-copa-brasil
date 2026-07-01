const SCOTLAND_FLAG = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}";

const COUNTRY_FLAGS: Record<string, string> = {
  alemanha: "🇩🇪",
  argentina: "🇦🇷",
  brasil: "🇧🇷",
  escocia: SCOTLAND_FLAG,
  espanha: "🇪🇸",
  franca: "🇫🇷",
  frança: "🇫🇷",
  haiti: "🇭🇹",
  japao: "🇯🇵",
  japão: "🇯🇵",
  japan: "🇯🇵",
  marrocos: "🇲🇦",
  norway: "🇳🇴",
  noruega: "🇳🇴",
  portugal: "🇵🇹",
  scotland: SCOTLAND_FLAG
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
