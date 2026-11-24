/**
 * Tipo do veículo em versão curta para cartões e listas: corta no primeiro "," ou "(" e limita o tamanho.
 * Ex.: "Strada Freedom Cabine Dupla 1.3 Flex, com Engate" -> "Strada Freedom Cabine…"
 */
export function tipoResumido(tipo: string, max = 22): string {
  const base = tipo.split(/[,(]/)[0].trim();
  if (base.length <= max) return base === tipo.trim() ? base : `${base}…`;
  const corte = base.slice(0, max + 1);
  const ultimoEspaco = corte.lastIndexOf(" ");
  // não corta no meio de uma palavra
  return `${(ultimoEspaco > max / 2 ? corte.slice(0, ultimoEspaco) : base.slice(0, max)).trim()}…`;
}
