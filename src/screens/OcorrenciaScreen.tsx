import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { enviarOcorrencia } from '../api/ocorrencia';
import { ApiError } from '../api/client';
import type { DispositivoVinculado, TipoOcorrencia } from '../types';

interface Props {
  dispositivo: DispositivoVinculado;
  onVoltar: () => void;
}

/**
 * Registro de ocorrência pelo aluno.
 *
 * A ordem é deliberada: a biometria vem PRIMEIRO, antes do formulário.
 * Assim o aluno só consegue preencher alguma coisa depois de o aparelho
 * confirmar que é ele - e um formulário preenchido nunca fica sem dono.
 *
 * O que o aluno escreve aqui é o que a coordenação preencheria na mão:
 * motivo, observação e se o responsável já está ciente. Nada disso vira
 * falta sozinho: o envio fica pendente até alguém da coordenação
 * aprovar ou negar pelo site.
 */
type Etapa = 'inicio' | 'formulario' | 'enviado';

export default function OcorrenciaScreen({ dispositivo, onVoltar }: Props) {
  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const [verificando, setVerificando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [tipo, setTipo] = useState<TipoOcorrencia>('falta');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [responsavelCiente, setResponsavelCiente] = useState(false);

  async function confirmarBiometria() {
    setErro(null);
    setVerificando(true);
    try {
      if (!(await LocalAuthentication.hasHardwareAsync())) {
        setErro('Este aparelho não tem sensor de biometria nem bloqueio por PIN.');
        return;
      }
      if (!(await LocalAuthentication.isEnrolledAsync())) {
        setErro(
          'Nenhuma biometria ou senha de bloqueio cadastrada neste aparelho. Configure nos ajustes do celular e tente de novo.'
        );
        return;
      }
      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme sua identidade para registrar a ocorrência',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });
      if (!resultado.success) {
        setErro('Identidade não confirmada. Nada foi registrado.');
        return;
      }
      setEtapa('formulario');
    } finally {
      setVerificando(false);
    }
  }

  async function enviar() {
    if (motivo.trim().length < 3) {
      setErro('Escreva o motivo da ocorrência.');
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await enviarOcorrencia(
        dispositivo.baseUrl,
        dispositivo.deviceUuid,
        dispositivo.deviceSecret,
        { tipo, motivo: motivo.trim(), observacao: observacao.trim(), responsavelCiente }
      );
      if (!resposta.sucesso) {
        setErro(resposta.mensagem);
        return;
      }
      setEtapa('enviado');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível enviar. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  if (etapa === 'enviado') {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.emoji}>✓</Text>
        <Text style={estilos.titulo}>Enviado para a coordenação</Text>
        <Text style={estilos.texto}>
          A coordenação vai analisar e decidir. Enquanto isso, nada foi lançado na sua
          frequência — você não precisa fazer mais nada.
        </Text>
        <TouchableOpacity style={estilos.botao} onPress={onVoltar}>
          <Text style={estilos.botaoTexto}>Voltar ao início</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (etapa === 'inicio') {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>Registrar ocorrência</Text>
        <Text style={estilos.texto}>
          Confirme sua identidade para começar. Depois você explica o que aconteceu e a
          coordenação analisa.
        </Text>
        {erro && <Text style={estilos.erro}>{erro}</Text>}
        <TouchableOpacity
          style={[estilos.botao, verificando && estilos.botaoDesativado]}
          onPress={confirmarBiometria}
          disabled={verificando}
        >
          {verificando
            ? <ActivityIndicator color="#fff" />
            : <Text style={estilos.botaoTexto}>Confirmar com biometria</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={onVoltar}>
          <Text style={estilos.link}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={estilos.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps="handled">
        <Text style={estilos.titulo}>O que aconteceu?</Text>
        <Text style={estilos.subtitulo}>Identificado como {dispositivo.nomeAluno}</Text>

        <Text style={estilos.rotulo}>Tipo</Text>
        <View style={estilos.linhaOpcoes}>
          {(['falta', 'atraso'] as TipoOcorrencia[]).map((opcao) => (
            <TouchableOpacity
              key={opcao}
              style={[estilos.opcao, tipo === opcao && estilos.opcaoAtiva]}
              onPress={() => setTipo(opcao)}
            >
              <Text style={[estilos.opcaoTexto, tipo === opcao && estilos.opcaoTextoAtivo]}>
                {opcao === 'falta' ? 'Falta' : 'Atraso'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={estilos.rotulo}>Motivo</Text>
        <TextInput
          style={estilos.campo}
          value={motivo}
          onChangeText={setMotivo}
          placeholder="Ex.: consulta médica"
          maxLength={150}
        />

        <Text style={estilos.rotulo}>Observação (opcional)</Text>
        <TextInput
          style={[estilos.campo, estilos.campoAlto]}
          value={observacao}
          onChangeText={setObservacao}
          placeholder="Algo que a coordenação precise saber"
          multiline
          maxLength={2000}
        />

        <View style={estilos.linhaSwitch}>
          <View style={estilos.switchTexto}>
            <Text style={estilos.rotulo}>Meu responsável está ciente</Text>
            <Text style={estilos.ajuda}>A coordenação confere essa informação.</Text>
          </View>
          <Switch value={responsavelCiente} onValueChange={setResponsavelCiente} />
        </View>

        {erro && <Text style={estilos.erro}>{erro}</Text>}

        <TouchableOpacity
          style={[estilos.botao, enviando && estilos.botaoDesativado]}
          onPress={enviar}
          disabled={enviando}
        >
          {enviando
            ? <ActivityIndicator color="#fff" />
            : <Text style={estilos.botaoTexto}>Enviar para a coordenação</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={onVoltar}>
          <Text style={estilos.link}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 24, paddingBottom: 48 },
  centro: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 56, color: '#047857', marginBottom: 12 },
  titulo: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 6, textAlign: 'center' },
  subtitulo: { fontSize: 14, color: '#475569', marginBottom: 20, textAlign: 'center' },
  texto: { fontSize: 15, color: '#475569', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  rotulo: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 6, marginTop: 14 },
  ajuda: { fontSize: 12, color: '#64748b' },
  campo: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a',
  },
  campoAlto: { height: 96, textAlignVertical: 'top' },
  linhaOpcoes: { flexDirection: 'row', gap: 10 },
  opcao: {
    flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
    borderColor: '#cbd5e1', backgroundColor: '#fff', alignItems: 'center',
  },
  opcaoAtiva: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  opcaoTexto: { fontSize: 15, color: '#475569', fontWeight: '600' },
  opcaoTextoAtivo: { color: '#2563eb' },
  linhaSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  switchTexto: { flex: 1, paddingRight: 12 },
  botao: {
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 15,
    alignItems: 'center', marginTop: 24, minWidth: 240,
  },
  botaoDesativado: { opacity: 0.6 },
  botaoTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: '#2563eb', fontSize: 14, marginTop: 16, textAlign: 'center' },
  erro: { color: '#b91c1c', fontSize: 14, marginTop: 14, textAlign: 'center' },
});
