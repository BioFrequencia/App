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

import { criarConta, dispositivoDaResposta } from '../api/conta';
import { ApiError } from '../api/client';
import { obterApiBaseUrl } from '../config';
import { dataBrParaIso, mascararData, validarCriarConta } from '../contaRegras';
import { getOrCreateDeviceUuid, salvarDispositivoVinculado } from '../storage/deviceStorage';
import type { DispositivoVinculado } from '../types';
import { estilosConta as estilos } from './estilosConta';

interface Props {
  /** Chamado depois que a conta é criada e a conexão salva no SecureStore. */
  onConectado: (dispositivo: DispositivoVinculado) => void;
  onVoltar: () => void;
}

/**
 * Cadastro do aluno no app. A conta é ligada ao cadastro que a escola já
 * fez: o nome e a data de nascimento precisam ser os mesmos (vale o nome
 * completo ou o primeiro e o último nome). Quem ainda não foi cadastrado
 * pela escola recebe a orientação de procurar a coordenação.
 */
export default function CriarContaScreen({ onConectado, onVoltar }: Props) {
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleCriarConta() {
    const problema = validarCriarConta({ nome, dataNascimento, email, senha, confirmacaoSenha });
    setErro(problema);
    if (problema) {
      return;
    }

    setCarregando(true);
    try {
      const baseUrl = obterApiBaseUrl();
      const deviceUuid = await getOrCreateDeviceUuid();
      const resposta = await criarConta(
        baseUrl,
        { nome, dataNascimentoIso: dataBrParaIso(dataNascimento) ?? '', email, senha },
        deviceUuid
      );

      if (!resposta.sucesso || !resposta.dados) {
        setErro(resposta.mensagem || 'Não foi possível criar a conta.');
        return;
      }

      const dispositivo = dispositivoDaResposta(baseUrl, deviceUuid, resposta.dados);
      await salvarDispositivoVinculado(dispositivo);
      onConectado(dispositivo);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Erro inesperado ao criar a conta. Tente de novo.');
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
        <Text style={estilos.titulo}>Criar conta</Text>
        <Text style={estilos.subtitulo}>
          Use o nome e a data de nascimento do seu cadastro na escola.
        </Text>

        <View style={estilos.campo}>
          <Text style={estilos.rotulo}>Nome completo</Text>
          <TextInput
            style={estilos.input}
            placeholder="Como está no cadastro da escola"
            placeholderTextColor="#9ca3af"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            value={nome}
            onChangeText={setNome}
            editable={!carregando}
          />
        </View>

        <View style={estilos.campo}>
          <Text style={estilos.rotulo}>Data de nascimento</Text>
          <TextInput
            style={estilos.input}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            maxLength={10}
            value={dataNascimento}
            onChangeText={(texto) => setDataNascimento(mascararData(texto))}
            editable={!carregando}
          />
        </View>

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
          <Text style={estilos.rotulo}>Senha (mínimo 6 caracteres)</Text>
          <TextInput
            style={estilos.input}
            placeholder="Crie uma senha"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            value={senha}
            onChangeText={setSenha}
            editable={!carregando}
          />
        </View>

        <View style={estilos.campo}>
          <Text style={estilos.rotulo}>Repita a senha</Text>
          <TextInput
            style={estilos.input}
            placeholder="Digite a senha de novo"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            value={confirmacaoSenha}
            onChangeText={setConfirmacaoSenha}
            onSubmitEditing={handleCriarConta}
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
          onPress={handleCriarConta}
          disabled={carregando}
        >
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.textoBotao}>Criar conta</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={estilos.link} onPress={onVoltar} disabled={carregando}>
          <Text style={estilos.textoLink}>Já tenho conta. Entrar</Text>
        </TouchableOpacity>

        <Text style={estilos.rodape}>
          Ainda não foi cadastrado pela escola? Peça à coordenação para cadastrar você.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
