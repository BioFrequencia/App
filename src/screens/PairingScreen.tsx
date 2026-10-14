import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { vincularDispositivo } from '../api/pairing';
import { ApiError } from '../api/client';
import { getOrCreateDeviceUuid, salvarDispositivoVinculado } from '../storage/deviceStorage';
import { obterApiBaseUrl } from '../config';
import type { DispositivoVinculado } from '../types';

interface Props {
  /** Chamado depois que o vínculo é salvo com sucesso no SecureStore. */
  onVinculado: (dispositivo: DispositivoVinculado) => void;
  /** Chamado quando o aluno ainda não tem cadastro e escolhe criar um. */
  onIrParaCadastro: () => void;
}

export default function PairingScreen({ onVinculado, onIrParaCadastro }: Props) {
  const [codigo, setCodigo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // O endereço da API vem da configuração do build (src/config.ts): o
  // aluno não digita mais URL nenhuma para vincular o aparelho.
  const baseUrl = obterApiBaseUrl();

  async function handleVincular() {
    setErro(null);

    const codigoLimpo = codigo.trim().toUpperCase();

    if (codigoLimpo.length !== 8) {
      setErro('O código de vínculo tem 8 caracteres. Confira com a coordenação.');
      return;
    }

    setCarregando(true);
    try {
      const deviceUuid = await getOrCreateDeviceUuid();

      const resposta = await vincularDispositivo(baseUrl, codigoLimpo, deviceUuid);

      if (!resposta.sucesso || !resposta.dados) {
        setErro(resposta.mensagem || 'Não foi possível vincular o dispositivo.');
        return;
      }

      const dispositivo: DispositivoVinculado = {
        baseUrl: baseUrl,
        deviceUuid,
        deviceSecret: resposta.dados.device_secret,
        idAluno: resposta.dados.id_aluno,
        nomeAluno: resposta.dados.nome_aluno,
      };

      await salvarDispositivoVinculado(dispositivo);
      onVinculado(dispositivo);
    } catch (e) {
      if (e instanceof ApiError) {
        setErro(e.message);
      } else {
        setErro('Erro inesperado ao vincular o dispositivo.');
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>BioFrequência</Text>
        <Text style={styles.subtitulo}>
          Vincule este celular ao seu cadastro de aluno usando o código fornecido pela
          coordenação.
        </Text>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Código de vínculo (8 caracteres)</Text>
          <TextInput
            style={[styles.input, styles.inputCodigo]}
            placeholder="PP7VJFBD"
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            value={codigo}
            onChangeText={setCodigo}
            editable={!carregando}
          />
        </View>

        {erro ? (
          <View style={styles.avisoErro}>
            <Text style={styles.textoErro}>{erro}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.botao, carregando && styles.botaoDesabilitado]}
          onPress={handleVincular}
          disabled={carregando}
        >
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.textoBotao}>Vincular</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.rodape}>
          O código é de uso único e expira em 15 minutos. Peça um novo à coordenação se o
          seu tiver expirado.
        </Text>

        <TouchableOpacity style={styles.linkCadastro} onPress={onIrParaCadastro} disabled={carregando}>
          <Text style={styles.textoLinkCadastro}>Ainda não tenho cadastro? Cadastre-se</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centralizado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 21,
  },
  campo: {
    marginBottom: 18,
  },
  rotulo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  inputCodigo: {
    letterSpacing: 4,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 20,
  },
  avisoErro: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  textoErro: {
    color: '#b91c1c',
    fontSize: 14,
  },
  botao: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  botaoDesabilitado: {
    opacity: 0.7,
  },
  textoBotao: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  rodape: {
    marginTop: 20,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  linkCadastro: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 8,
  },
  textoLinkCadastro: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
});
