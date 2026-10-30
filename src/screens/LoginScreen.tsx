import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { dispositivoDaResposta, entrar } from '../api/conta';
import { ApiError } from '../api/client';
import { obterApiBaseUrl } from '../config';
import { validarEntrar } from '../contaRegras';
import { getOrCreateDeviceUuid, salvarDispositivoVinculado } from '../storage/deviceStorage';
import type { DispositivoVinculado } from '../types';
import { estilosConta as estilos } from './estilosConta';

interface Props {
  /** Chamado depois que a conexão do celular é salva no SecureStore. */
  onConectado: (dispositivo: DispositivoVinculado) => void;
  onCriarConta: () => void;
  /** Por que o aluno voltou para cá (ex.: o celular foi desconectado). */
  aviso?: string | null;
}

/**
 * Primeira tela do app: o aluno entra com o e-mail e a senha da conta
 * dele. O login conecta este celular à conta (e desconecta o anterior,
 * se houver); a partir daí o check-in é só a biometria.
 */
export default function LoginScreen({ onConectado, onCriarConta, aviso }: Props) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleEntrar() {
    const problema = validarEntrar(email, senha);
    setErro(problema);
    if (problema) {
      return;
    }

    setCarregando(true);
    try {
      const baseUrl = obterApiBaseUrl();
      const deviceUuid = await getOrCreateDeviceUuid();
      const resposta = await entrar(baseUrl, email, senha, deviceUuid);

      if (!resposta.sucesso || !resposta.dados) {
        setErro(resposta.mensagem || 'Não foi possível entrar.');
        return;
      }

      const dispositivo = dispositivoDaResposta(baseUrl, deviceUuid, resposta.dados);
      await salvarDispositivoVinculado(dispositivo);
      onConectado(dispositivo);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Erro inesperado ao entrar. Tente de novo.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={estilos.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps="handled">
        <Text style={estilos.titulo}>BioFrequência</Text>
        <Text style={estilos.subtitulo}>Entre com a sua conta de aluno.</Text>

        {aviso ? (
          <View style={estilos.avisoInfo}>
            <Text style={estilos.textoInfo}>{aviso}</Text>
          </View>
        ) : null}

        <View style={estilos.campo}>
          <Text style={estilos.rotulo}>E-mail</Text>
          <TextInput
            style={estilos.input}
            placeholder="seu@email.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            value={email}
            onChangeText={setEmail}
            editable={!carregando}
          />
        </View>

        <View style={estilos.campo}>
          <Text style={estilos.rotulo}>Senha</Text>
          <TextInput
            style={estilos.input}
            placeholder="Sua senha"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            value={senha}
            onChangeText={setSenha}
            onSubmitEditing={handleEntrar}
            editable={!carregando}
          />
        </View>

        {erro ? (
          <View style={estilos.avisoErro}>
            <Text style={estilos.textoErro}>{erro}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[estilos.botao, carregando && estilos.botaoDesabilitado]}
          onPress={handleEntrar}
          disabled={carregando}
        >
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.textoBotao}>Entrar</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={estilos.link} onPress={onCriarConta} disabled={carregando}>
          <Text style={estilos.textoLink}>Ainda não tem conta? Criar conta</Text>
        </TouchableOpacity>

        <Text style={estilos.rodape}>
          A conta fica conectada a um celular por vez: entrar em outro aparelho desconecta este.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
