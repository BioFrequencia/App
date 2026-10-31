import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { cores, espaco, fontes, LARGURA_TABLET, raio } from './tema';
import { iniciais } from './formatar';

/** Layout de tablet a partir de LARGURA_TABLET (vale também para o celular deitado). */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { largura: width, altura: height, tablet: width >= LARGURA_TABLET };
}

type NomeFeather = React.ComponentProps<typeof Feather>['name'];
/** Ícones do Feather (o mesmo traço do site) e os dois de biometria do Material. */
export type NomeIcone = NomeFeather | 'mdi:fingerprint' | 'mdi:face-recognition';

export function Icone({ nome, tamanho = 20, cor = cores.tinta700 }: { nome: NomeIcone; tamanho?: number; cor?: string }) {
  if (nome === 'mdi:fingerprint' || nome === 'mdi:face-recognition') {
    return <MaterialCommunityIcons name={nome.slice(4) as 'fingerprint' | 'face-recognition'} size={tamanho} color={cor} />;
  }
  return <Feather name={nome as NomeFeather} size={tamanho} color={cor} />;
}

export function Tela({ children, fundo = cores.nevoa100 }: { children: React.ReactNode; fundo?: string }) {
  return (
    <SafeAreaView style={[estilos.tela, { backgroundColor: fundo }]} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="dark" />
      {children}
    </SafeAreaView>
  );
}

/** Largura confortável de leitura no tablet; no celular ocupa tudo. */
export function Conteudo({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[estilos.conteudo, style]}>{children}</View>;
}

interface CabecalhoProps {
  titulo: string;
  subtitulo?: string;
  aoVoltar?: () => void;
  direita?: React.ReactNode;
}

export function Cabecalho({ titulo, subtitulo, aoVoltar, direita }: CabecalhoProps) {
  return (
    <View style={estilos.cabecalho}>
      {aoVoltar ? (
        <Pressable onPress={aoVoltar} style={estilos.botaoVoltar} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8}>
          <Icone nome="chevron-left" tamanho={24} cor={cores.tinta900} />
        </Pressable>
      ) : null}
      <View style={estilos.cabecalhoTextos}>
        <Text style={estilos.cabecalhoTitulo} numberOfLines={1}>{titulo}</Text>
        {subtitulo ? <Text style={estilos.cabecalhoSubtitulo} numberOfLines={1}>{subtitulo}</Text> : null}
      </View>
      {direita}
    </View>
  );
}

export function Cartao({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[estilos.cartao, style]}>{children}</View>;
}

export function TituloSecao({ children, acao }: { children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <View style={estilos.tituloSecaoLinha}>
      <Text style={estilos.tituloSecao}>{children}</Text>
      {acao}
    </View>
  );
}

type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'claro';

interface BotaoProps {
  titulo: string;
  aoPressionar: () => void;
  variante?: VarianteBotao;
  icone?: NomeIcone;
  carregando?: boolean;
  desabilitado?: boolean;
  grande?: boolean;
  style?: StyleProp<ViewStyle>;
}

const CORES_BOTAO: Record<VarianteBotao, { fundo: string; texto: string; borda: string }> = {
  primario: { fundo: cores.indigo, texto: '#ffffff', borda: cores.indigo },
  secundario: { fundo: cores.superficie, texto: cores.tinta900, borda: cores.nevoa200 },
  perigo: { fundo: cores.perigo100, texto: cores.perigoEscuro, borda: cores.perigo100 },
  claro: { fundo: cores.indigo50, texto: cores.indigo600, borda: cores.indigo100 },
};

export function Botao({ titulo, aoPressionar, variante = 'primario', icone, carregando, desabilitado, grande, style }: BotaoProps) {
  const paleta = CORES_BOTAO[variante];
  const inativo = desabilitado || carregando;
  return (
    <Pressable
      onPress={aoPressionar}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      style={({ pressed }) => [
        estilos.botao,
        grande && estilos.botaoGrande,
        { backgroundColor: paleta.fundo, borderColor: paleta.borda },
        pressed && !inativo && estilos.botaoPressionado,
        inativo && estilos.botaoInativo,
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={paleta.texto} />
      ) : (
        <>
          {icone ? <Icone nome={icone} tamanho={grande ? 22 : 18} cor={paleta.texto} /> : null}
          <Text style={[estilos.botaoTexto, grande && estilos.botaoTextoGrande, { color: paleta.texto }]}>{titulo}</Text>
        </>
      )}
    </Pressable>
  );
}

interface CampoProps extends TextInputProps {
  rotulo: string;
  ajuda?: string;
}

export function Campo({ rotulo, ajuda, style, ...props }: CampoProps) {
  const [focado, setFocado] = React.useState(false);
  return (
    <View style={estilos.campo}>
      <Text style={estilos.campoRotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={cores.tinta300}
        {...props}
        onFocus={(e) => { setFocado(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocado(false); props.onBlur?.(e); }}
        style={[estilos.campoInput, focado && estilos.campoInputFocado, style]}
      />
      {ajuda ? <Text style={estilos.campoAjuda}>{ajuda}</Text> : null}
    </View>
  );
}

type TipoAviso = 'sucesso' | 'erro' | 'info' | 'neutro';

const CORES_AVISO: Record<TipoAviso, { fundo: string; texto: string; icone: NomeIcone }> = {
  sucesso: { fundo: cores.esmeralda100, texto: cores.esmeraldaEscuro, icone: 'check-circle' },
  erro: { fundo: cores.perigo100, texto: cores.perigoEscuro, icone: 'alert-circle' },
  info: { fundo: cores.indigo50, texto: cores.indigo600, icone: 'info' },
  neutro: { fundo: cores.agua100, texto: cores.aguaEscuro, icone: 'clock' },
};

export function Aviso({ tipo, children, style }: { tipo: TipoAviso; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const paleta = CORES_AVISO[tipo];
  return (
    <View style={[estilos.aviso, { backgroundColor: paleta.fundo }, style]} accessibilityRole={tipo === 'erro' ? 'alert' : undefined}>
      <Icone nome={paleta.icone} tamanho={18} cor={paleta.texto} />
      <Text style={[estilos.avisoTexto, { color: paleta.texto }]}>{children}</Text>
    </View>
  );
}

type TipoSelo = 'ok' | 'pendente' | 'info' | 'perigo';

const CORES_SELO: Record<TipoSelo, { fundo: string; texto: string }> = {
  ok: { fundo: cores.esmeralda100, texto: cores.esmeraldaEscuro },
  pendente: { fundo: cores.nevoa200, texto: cores.tinta500 },
  info: { fundo: cores.indigo100, texto: cores.indigo600 },
  perigo: { fundo: cores.perigo100, texto: cores.perigoEscuro },
};

export function Selo({ tipo, texto, icone }: { tipo: TipoSelo; texto: string; icone?: NomeIcone }) {
  const paleta = CORES_SELO[tipo];
  return (
    <View style={[estilos.selo, { backgroundColor: paleta.fundo }]}>
      {icone ? <Icone nome={icone} tamanho={12} cor={paleta.texto} /> : null}
      <Text style={[estilos.seloTexto, { color: paleta.texto }]}>{texto}</Text>
    </View>
  );
}

export function Avatar({ nome, tamanho = 44 }: { nome: string; tamanho?: number }) {
  return (
    <View style={[estilos.avatar, { width: tamanho, height: tamanho, borderRadius: tamanho / 2 }]}>
      <Text style={[estilos.avatarTexto, { fontSize: tamanho * 0.36 }]}>{iniciais(nome)}</Text>
    </View>
  );
}

export function Carregando({ texto }: { texto?: string }) {
  return (
    <View style={estilos.centro}>
      <ActivityIndicator size="large" color={cores.indigo} />
      {texto ? <Text style={estilos.centroTexto}>{texto}</Text> : null}
    </View>
  );
}

export function Vazio({ icone, texto }: { icone: NomeIcone; texto: string }) {
  return (
    <View style={estilos.vazio}>
      <Icone nome={icone} tamanho={28} cor={cores.tinta300} />
      <Text style={estilos.vazioTexto}>{texto}</Text>
    </View>
  );
}

/** Filtro em forma de "chip" (turmas, situação). */
export function Chip({ texto, ativo, aoPressionar }: { texto: string; ativo: boolean; aoPressionar: () => void }) {
  return (
    <Pressable
      onPress={aoPressionar}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      style={[estilos.chip, ativo && estilos.chipAtivo]}
    >
      <Text style={[estilos.chipTexto, ativo && estilos.chipTextoAtivo]}>{texto}</Text>
    </Pressable>
  );
}

export const estilosTexto = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: 26, color: cores.tinta900, letterSpacing: -0.4 },
  corpo: { fontFamily: fontes.texto, fontSize: 15, color: cores.tinta700, lineHeight: 22 },
  fraco: { fontFamily: fontes.texto, fontSize: 13, color: cores.tinta500, lineHeight: 19 },
  forte: { fontFamily: fontes.textoForte, fontSize: 15, color: cores.tinta900 },
  rotulo: { fontFamily: fontes.textoSemi, fontSize: 12, color: cores.tinta500, letterSpacing: 0.6, textTransform: 'uppercase' },
});

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: espaco.lg },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, paddingVertical: espaco.md },
  botaoVoltar: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.nevoa200,
  },
  cabecalhoTextos: { flex: 1 },
  cabecalhoTitulo: { fontFamily: fontes.titulo, fontSize: 22, color: cores.tinta900, letterSpacing: -0.3 },
  cabecalhoSubtitulo: { fontFamily: fontes.texto, fontSize: 13, color: cores.tinta500, marginTop: 2 },
  cartao: {
    backgroundColor: cores.superficie, borderRadius: raio.grande, borderWidth: 1, borderColor: cores.nevoa200,
    padding: espaco.lg + 2,
    shadowColor: cores.tinta900, shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  tituloSecaoLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espaco.md },
  tituloSecao: { fontFamily: fontes.tituloMedio, fontSize: 17, color: cores.tinta900 },
  botao: {
    minHeight: 48, borderRadius: raio.medio, borderWidth: 1, paddingHorizontal: espaco.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaco.sm,
  },
  botaoGrande: { minHeight: 58, borderRadius: raio.medio + 2, paddingHorizontal: espaco.xl },
  botaoPressionado: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  botaoInativo: { opacity: 0.55 },
  botaoTexto: { fontFamily: fontes.textoForte, fontSize: 15 },
  botaoTextoGrande: { fontSize: 17 },
  campo: { marginBottom: espaco.lg },
  campoRotulo: { fontFamily: fontes.textoSemi, fontSize: 13, color: cores.tinta700, marginBottom: 6 },
  campoInput: {
    minHeight: 50, borderRadius: raio.medio, borderWidth: 1, borderColor: cores.nevoa200, backgroundColor: cores.superficie,
    paddingHorizontal: 14, fontFamily: fontes.texto, fontSize: 16, color: cores.tinta900,
  },
  campoInputFocado: { borderColor: cores.indigo },
  campoAjuda: { fontFamily: fontes.texto, fontSize: 12, color: cores.tinta500, marginTop: 6 },
  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: raio.medio, padding: 14 },
  avisoTexto: { flex: 1, fontFamily: fontes.textoMedio, fontSize: 14, lineHeight: 20 },
  selo: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  seloTexto: { fontFamily: fontes.textoSemi, fontSize: 12 },
  avatar: { backgroundColor: cores.indigo100, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: fontes.tituloMedio, color: cores.indigo600 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl, gap: espaco.md },
  centroTexto: { fontFamily: fontes.textoMedio, fontSize: 14, color: cores.tinta500, textAlign: 'center' },
  vazio: { alignItems: 'center', justifyContent: 'center', paddingVertical: espaco.xxl, gap: espaco.sm },
  vazioTexto: { fontFamily: fontes.texto, fontSize: 14, color: cores.tinta500, textAlign: 'center' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
    borderColor: cores.nevoa200, backgroundColor: cores.superficie,
  },
  chipAtivo: { backgroundColor: cores.indigo, borderColor: cores.indigo },
  chipTexto: { fontFamily: fontes.textoSemi, fontSize: 13, color: cores.tinta700 },
  chipTextoAtivo: { color: '#ffffff' },
});
