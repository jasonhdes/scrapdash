const STATE_NAME_TO_UF: Record<string, string> = {
  acre: 'ac',
  alagoas: 'al',
  amapa: 'ap',
  amazonas: 'am',
  bahia: 'ba',
  ceara: 'ce',
  'distrito federal': 'df',
  'espirito santo': 'es',
  goias: 'go',
  maranhao: 'ma',
  'mato grosso': 'mt',
  'mato grosso do sul': 'ms',
  'minas gerais': 'mg',
  para: 'pa',
  paraiba: 'pb',
  parana: 'pr',
  pernambuco: 'pe',
  piaui: 'pi',
  'rio de janeiro': 'rj',
  'rio grande do norte': 'rn',
  'rio grande do sul': 'rs',
  rondonia: 'ro',
  roraima: 'rr',
  'santa catarina': 'sc',
  'sao paulo': 'sp',
  sergipe: 'se',
  tocantins: 'to',
};

// Faixa Unicode dos acentos combinantes (0300-036F), construída via charcode
// em vez de um literal na regex para evitar problema de encoding no arquivo.
const COMBINING_MARKS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g',
);

function normalize(value: string) {
  return value.normalize('NFD').replace(COMBINING_MARKS, '').trim().toLowerCase();
}

/**
 * Mercado Livre devolve o nome completo do estado (`receiver_address.state.name`,
 * ex.: "São Paulo"), não a sigla — o mapa (@svg-maps/brazil) identifica cada
 * estado pela sigla em minúsculo (ex.: "sp"). Também aceita a sigla direto,
 * caso o dado já venha nesse formato.
 */
export function stateNameToUf(stateName: string): string | null {
  const normalized = normalize(stateName);

  if (normalized.length === 2 && Object.values(STATE_NAME_TO_UF).includes(normalized)) {
    return normalized;
  }

  return STATE_NAME_TO_UF[normalized] ?? null;
}
