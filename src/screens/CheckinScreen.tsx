import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { enviarCheckinBiometrico } from '../api/checkin';
import { ApiError } from '../api/client';
import { confirmarIdentidade } from '../biometria';
import { obterApiBaseUrl } from '../config';
import { limparVinculo } from '../storage/deviceStorage';
import type { DispositivoVinculado } from '../types';

interface Props {
  dispositivo: DispositivoVinculado;
  /** Chamado depois que o SecureStore é limpo, para voltar à tela de vínculo. */
  onSair: () => void;
  /** Abre o registro de ocorrência (falta/atraso) com justificativa. */
  onRegistrarOcorrencia: () => void;
}

type StatusFeedback = { tipo: 'sucesso' | 'erro'; texto: string } | null;

export default function CheckinScreen({ dispositivo, onSair, onRegistrarOcorrencia }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<StatusFeedback>(null);

  async function handleConfirmarChegada() {
    setFeedback(null);
    setEnviando(true);
    try {
      const identidade = await confirmarIdentidade('Confirme sua identidade para o check-in');
      if (!identidade.ok) {
        setFeedback({ tipo: 'erro', texto: identidade.mensagem });
        return;
      }

      // Só monta e assina a requisição DEPOIS que a biometria local
      // confirmou o dono do aparelho - a API nunca vê o template
      // biométrico, só recebe o check-in assinado (ver checkinBiometrico.php).
      // Endereço do build atual, e não o salvo no vínculo: um aparelho
      // vinculado com uma versão antiga do app (que apontava para o
      // emulador ou a rede local) continuava usando aquele endereço.
      const resposta = await enviarCheckinBiometrico(
        obterApiBaseUrl(),
        dispositivo.deviceUuid,
        dispositivo.deviceSecret,
        'atraso'
      );

      if (!resposta.sucesso) {
        setFeedback({ tipo: 'erro', texto: resposta.mensagem || 'Falha ao registrar o check-in.' });
        return;
      }

      setFeedback({
        tipo: 'sucesso',
        texto: 'Check-in enviado. Aguardando confirmação da coordenação.',
      });
    } catch (e) {
      setFeedback({
        tipo: 'erro',
        texto:
          e instanceof ApiError
            ? e.message
            : 'Erro inesperado ao confirmar a chegada. Tente novamente.',
      });
    } finally {
      setEnviando(false);
    }
  }

  function handleSair() {
    Alert.alert(
      'Trocar dispositivo',
      'Isso vai desvincular este celular do seu cadastro. Você vai precisar de um novo código da coordenação para vincular novamente. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await limparVinculo();
            onSair();
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topo}>
        <Text style={styles.saudacao}>Olá,</Text>
        <Text style={styles.nome}>{dispositivo.nomeAluno}</Text>
      </View>

      <View style={styles.centro}>
        <TouchableOpacity
          style={[styles.botaoCheckin, enviando && styles.botaoDesabilitado]}
          onPress={handleConfirmarChegada}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Text style={styles.textoBotaoCheckin}>Confirmar chegada{'\n'}com biometria</Text>
          )}
        </TouchableOpacity>

        {feedback ? (
          <View
            style={[
              styles.banner,
              feedback.tipo === 'sucesso' ? styles.bannerSucesso : styles.bannerErro,
            ]}
          >
            <Text
              style={[
                styles.textoBanner,
                feedback.tipo === 'sucesso' ? styles.textoSucesso : styles.textoErro,
              ]}
            >
              {feedback.texto}
            </Text>
          </View>
        ) : (
          <Text style={styles.dica}>
            Toque no botão ao chegar atrasado. Você vai confirmar com a biometria ou PIN do
            próprio celular.
          </Text>
        )}
      </View>

      {/* Registro de falta/atraso com justificativa: o aluno confirma a
          biometria, explica o que houve e a coordenação decide. Separado
          do check-in de chegada, que é um toque só. */}
      <TouchableOpacity style={styles.botaoOcorrencia} onPress={onRegistrarOcorrencia}>
        <Text style={styles.textoBotaoOcorrencia}>Registrar falta ou atraso</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botaoSair} onPress={handleSair}>
        <Text style={styles.textoBotaoSair}>Trocar dispositivo / Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  topo: {
    marginTop: 24,
    marginBottom: 12,
  },
  saudacao: {
    fontSize: 16,
    color: '#64748b',
  },
  nome: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoCheckin: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  botaoDesabilitado: {
    opacity: 0.7,
  },
  textoBotaoCheckin: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  dica: {
    marginTop: 28,
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  banner: {
    marginTop: 28,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    maxWidth: 320,
  },
  bannerSucesso: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  bannerErro: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  textoBanner: {
    fontSize: 14,
    textAlign: 'center',
  },
  textoSucesso: {
    color: '#15803d',
  },
  textoErro: {
    color: '#b91c1c',
  },
  botaoOcorrencia: {
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  textoBotaoOcorrencia: { color: '#2563eb', fontSize: 15, fontWeight: '700' },
  botaoSair: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  textoBotaoSair: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
});
