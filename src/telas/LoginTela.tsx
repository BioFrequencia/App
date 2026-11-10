import React, { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { entrar, pedirNovaSenha } from '../api/coordenacao';
import { definirToken, mensagemDeErro } from '../api/client';
import { problemaDoEmailDaConta } from '../mensagensRegras';
import { salvarSessao } from '../sessao';
import { sessaoDoLogin } from '../sessaoRegras';
import type { Sessao } from '../types';
import { Aviso, Botao, Campo, CampoSenha, Icone, Simbolo, Tela, useLayout } from '../ui/componentes';
import { cores, espaco, fontes, raio } from '../ui/tema';

interface Props {
  aoEntrar: (sessao: Sessao) => void;
  /** Por que voltou para o login (ex.: sessão expirada). */
  aviso?: string | null;
}

const RECURSOS: { icone: 'mdi:face-recognition' | 'mdi:fingerprint' | 'check-circle'; texto: string }[] = [
  { icone: 'mdi:face-recognition', texto: 'Reconhece o aluno pelo rosto e registra a presença na hora' },
  { icone: 'mdi:fingerprint', texto: 'Cadastro de biometria facial e digital, com consentimento' },
  { icone: 'check-circle', texto: 'Tudo aparece no site da coordenação, sem lançar à mão' },
];

/** Entrada com a mesma conta da coordenação usada no site. */
export default function LoginTela({ aoEntrar, aviso }: Props) {
  const { tablet } = useLayout();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // "Esqueci minha senha": o mesmo cartão troca de formulário.
  const [modo, setModo] = useState<'entrar' | 'senha'>('entrar');
  const [linkEnviado, setLinkEnviado] = useState<string | null>(null);

  function irPara(novo: 'entrar' | 'senha') {
    setErro(null);
    setLinkEnviado(null);
    setModo(novo);
  }

  // No pedido de senha nova, o "voltar" do Android volta para o login (e não fecha o app).
  useEffect(() => {
    if (modo !== 'senha') return undefined;
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
      irPara('entrar');
      return true;
    });
    return () => assinatura.remove();
  }, [modo]);

  async function pedirLink() {
    const problema = problemaDoEmailDaConta(email);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setCarregando(true);
    try {
      const resposta = await pedirNovaSenha(email);
      if (!resposta.sucesso) {
        setErro(resposta.mensagem || 'Não foi possível pedir a senha nova agora. Tente de novo em alguns minutos.');
        return;
      }
      setLinkEnviado(resposta.mensagem);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível pedir a senha nova agora. Tente de novo em alguns minutos.'));
    } finally {
      setCarregando(false);
    }
  }

  async function enviar() {
    if (!email.trim() || !senha) {
      setErro('Informe o e-mail e a senha da coordenação.');
      return;
    }
    setErro(null);
    setCarregando(true);
    try {
      const resposta = await entrar(email, senha);
      if (!resposta.sucesso || !resposta.dados) {
        setErro(resposta.mensagem || 'Não foi possível entrar.');
        return;
      }
      const sessao = sessaoDoLogin(resposta.dados);
      await salvarSessao(sessao);
      definirToken(sessao.token);
      aoEntrar(sessao);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível entrar. Tente de novo.'));
    } finally {
      setCarregando(false);
    }
  }

  const marca = (
    <View style={[estilos.marca, tablet && estilos.marcaTablet]}>
      <View style={[estilos.logo, tablet && estilos.logoTablet]}>
        <Simbolo tamanho={40} branco />
      </View>
      <Text style={[estilos.marcaNome, tablet && estilos.textoClaro]}>BioFrequência</Text>
      <Text style={[estilos.marcaFrase, tablet && estilos.textoClaroSuave]}>Biometria e presença para a coordenação</Text>
      {tablet ? (
        <View style={estilos.recursos}>
          {RECURSOS.map((recurso) => (
            <View key={recurso.texto} style={estilos.recurso}>
              <Icone nome={recurso.icone} tamanho={20} cor={cores.esmeralda} />
              <Text style={estilos.recursoTexto}>{recurso.texto}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <Tela fundo={tablet ? cores.indigo : cores.nevoa100}>
      <KeyboardAvoidingView style={estilos.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[estilos.rolagem, tablet && estilos.rolagemTablet]} keyboardShouldPersistTaps="handled">
          {marca}
          {modo === 'senha' ? (
            <View style={[estilos.formulario, tablet && estilos.formularioTablet]}>
              <Text style={estilos.titulo}>Criar uma senha nova</Text>
              <Text style={estilos.subtitulo}>
                Mandamos um link para o e-mail da sua conta. Ele abre a página do site onde você cria a senha nova; depois, todos
                os aparelhos conectados saem da conta.
              </Text>

              {linkEnviado ? (
                <>
                  <Aviso tipo="sucesso" style={estilos.aviso}>{linkEnviado}</Aviso>
                  <Botao titulo="Voltar para o login" icone="arrow-left" variante="secundario" aoPressionar={() => irPara('entrar')} />
                </>
              ) : (
                <>
                  <Campo
                    rotulo="E-mail"
                    placeholder="coordenacao@escola.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="username"
                    value={email}
                    onChangeText={setEmail}
                    editable={!carregando}
                    returnKeyType="send"
                    onSubmitEditing={pedirLink}
                  />

                  {erro ? <Aviso tipo="erro" style={estilos.aviso}>{erro}</Aviso> : null}

                  <Botao titulo="Enviar o link" icone="mail" grande carregando={carregando} aoPressionar={pedirLink} />

                  <Pressable onPress={() => irPara('entrar')} style={estilos.link} accessibilityRole="button" hitSlop={8}>
                    <Text style={estilos.linkTexto}>Voltar para o login</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <View style={[estilos.formulario, tablet && estilos.formularioTablet]}>
              <Text style={estilos.titulo}>Entrar</Text>
              <Text style={estilos.subtitulo}>Use a mesma conta da coordenação do site.</Text>

              {aviso ? <Aviso tipo="info" style={estilos.aviso}>{aviso}</Aviso> : null}

              <Campo
                rotulo="E-mail"
                placeholder="coordenacao@escola.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                value={email}
                onChangeText={setEmail}
                editable={!carregando}
                returnKeyType="next"
              />
              <CampoSenha
                rotulo="Senha"
                placeholder="Sua senha"
                autoComplete="password"
                textContentType="password"
                value={senha}
                onChangeText={setSenha}
                editable={!carregando}
                returnKeyType="go"
                onSubmitEditing={enviar}
              />

              {erro ? <Aviso tipo="erro" style={estilos.aviso}>{erro}</Aviso> : null}

              <Botao titulo="Entrar" icone="log-in" grande carregando={carregando} aoPressionar={enviar} />

              <Pressable onPress={() => irPara('senha')} style={estilos.link} accessibilityRole="button" hitSlop={8}>
                <Text style={estilos.linkTexto}>Esqueci minha senha</Text>
              </Pressable>

              <Text style={estilos.rodape}>
                No primeiro acesso do dia o servidor pode levar até um minuto para responder.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  rolagem: { flexGrow: 1, justifyContent: 'center', padding: espaco.xl, gap: espaco.xl },
  rolagemTablet: { flexDirection: 'row', alignItems: 'center', gap: 56, paddingHorizontal: 56 },
  marca: { alignItems: 'center' },
  marcaTablet: { flex: 1, alignItems: 'flex-start' },
  logo: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: cores.indigo, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', marginBottom: espaco.md,
  },
  logoTablet: { backgroundColor: 'rgba(255,255,255,0.14)' },
  textoClaro: { color: '#ffffff' },
  textoClaroSuave: { color: 'rgba(255,255,255,0.78)' },
  marcaNome: { fontFamily: fontes.titulo, fontSize: 30, color: cores.tinta900, letterSpacing: -0.6 },
  marcaFrase: { fontFamily: fontes.textoMedio, fontSize: 15, color: cores.tinta500, marginTop: 4 },
  recursos: { marginTop: espaco.xxl, gap: espaco.lg },
  recurso: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, maxWidth: 380 },
  recursoTexto: { flex: 1, fontFamily: fontes.textoMedio, fontSize: 15, lineHeight: 21, color: '#ffffff' },
  formulario: {
    width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: cores.superficie, borderRadius: raio.grande,
    padding: espaco.xl, borderWidth: 1, borderColor: cores.nevoa200,
  },
  formularioTablet: { flex: 1, maxWidth: 460 },
  titulo: { fontFamily: fontes.titulo, fontSize: 26, color: cores.tinta900, letterSpacing: -0.4 },
  subtitulo: { fontFamily: fontes.texto, fontSize: 14, color: cores.tinta500, marginTop: 4, marginBottom: espaco.xl },
  aviso: { marginBottom: espaco.lg },
  link: { alignSelf: 'center', marginTop: espaco.lg, paddingVertical: espaco.xs, paddingHorizontal: espaco.sm },
  linkTexto: { fontFamily: fontes.textoSemi, fontSize: 14, color: cores.indigo600 },
  rodape: { fontFamily: fontes.texto, fontSize: 12, lineHeight: 17, color: cores.tinta500, textAlign: 'center', marginTop: espaco.lg },
});
