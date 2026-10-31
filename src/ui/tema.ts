/**
 * Identidade visual do app: a mesma paleta, os mesmos raios e as mesmas
 * fontes do site (site/app/globals.css) - Space Grotesk nos títulos e
 * números, Plus Jakarta Sans no texto.
 */
export const cores = {
  tinta900: '#211f2b',
  tinta700: '#3a3844',
  tinta500: '#6b6f77',
  tinta300: '#a7a8b4',
  nevoa100: '#f7f5f7',
  nevoa200: '#eee9ec',
  superficie: '#ffffff',
  indigo: '#452ff6',
  indigo600: '#3823c9',
  indigo100: '#eae6fe',
  indigo50: '#f5f3ff',
  esmeralda: '#25db6c',
  esmeralda100: '#dff7e8',
  esmeraldaEscuro: '#12793f',
  agua: '#c8eae7',
  agua100: '#e9f7f5',
  aguaEscuro: '#1b6e67',
  perigo: '#e4453a',
  perigo100: '#fdecec',
  perigoEscuro: '#b42318',
} as const;

export const raio = { pequeno: 8, medio: 14, grande: 22 } as const;

export const espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const fontes = {
  titulo: 'SpaceGrotesk_700Bold',
  tituloMedio: 'SpaceGrotesk_600SemiBold',
  texto: 'PlusJakartaSans_400Regular',
  textoMedio: 'PlusJakartaSans_500Medium',
  textoSemi: 'PlusJakartaSans_600SemiBold',
  textoForte: 'PlusJakartaSans_700Bold',
} as const;

/** A partir desta largura (dp) a tela usa o layout de tablet. */
export const LARGURA_TABLET = 700;
