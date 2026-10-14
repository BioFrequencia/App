import React, { useEffect, useState } from 'react';
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

import { cadastroPendente, listarSalasPublico } from '../api/cadastro';
import { ApiError } from '../api/client';
import { getBaseUrl, setBaseUrl } from '../storage/deviceStorage';
import { GENEROS_ALUNO, type Sala } from '../types';

interface Props {
  /** Volta pra tela de vínculo (usada tanto pelo "Cancelar" quanto depois do envio). */
  onVoltar: () => void;
}

/** Converte "DD/MM/AAAA" pro formato que a API espera ("AAAA-MM-DD"), ou
 *  null se o texto não bate com esse formato - a validação "é uma data
 *  real e não é futura" fica por conta do dataNascimentoValida() do
 *  backend (aluno/cadastroPendente.php); aqui só garante o formato certo
 *  antes de mandar. */
function paraIso(dataBr: string): string | null {
  const m = dataBr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  return `${ano}-${mes}-${dia}`;
}

export default function CadastroScreen({ onVoltar }: Props) {
  const [baseUrl, setBaseUrlState] = useState('');
  const [salas, setSalas] = useState<Sala[] | null>(null);
  const [carregandoSalas, setCarregandoSalas] = useState(false);

  const [nome, setNome] = useState('');
  const [idSala, setIdSala] = useState<number | null>(null);
  const [dataNascimento, setDataNascimento] = useState('');
  const [genero, setGenero] = useState<(typeof GENEROS_ALUNO)[number] | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [carregandoConfig, setCarregandoConfig] = useState(true);

  useEffect(() => {
    (async () => {
      const salvo = await getBaseUrl();
      if (salvo) setBaseUrlState(salvo);
      setCarregandoConfig(false);
    })();
  }, []);

  async function handleBuscarTurmas() {
    setErro(null);
    const baseUrlLimpa = baseUrl.trim();
    if (!baseUrlLimpa) {
      setErro('Informe o endereço da API da escola.');
      return;
    }
    setCarregandoSalas(true);
    try {
      await setBaseUrl(baseUrlLimpa);
      const resposta = await listarSalasPublico(baseUrlLimpa);
      if (!resposta.sucesso || !resposta.dados) {
        setErro(resposta.mensagem || 'Não foi possível carregar as turmas.');
        setSalas(null);
        return;
      }
      setSalas(resposta.dados);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Erro inesperado ao carregar as turmas.');
      setSalas(null);
    } finally {
      setCarregandoSalas(false);
    }
  }

  async function handleEnviar() {
    setErro(null);

    if (!salas) {
      setErro('Carregue a lista de turmas antes de continuar.');
      return;
    }
    if (!nome.trim()) {
      setErro('Informe seu nome completo.');
      return;
    }
    if (!idSala) {
      setErro('Selecione sua turma.');
      return;
    }
    const dataIso = paraIso(dataNascimento);
    if (!dataIso) {
      setErro('Informe a data de nascimento no formato DD/MM/AAAA.');
      return;
    }
    if (!genero) {
      setErro('Selecione seu gênero.');
      return;
    }

    setEnviando(true);
    try {
      const resposta = await cadastroPendente(baseUrl.trim(), {
        nomeAluno: nome.trim(),
        idSala,
        dtaNascAluno: dataIso,
        generoAluno: genero,
      });

      if (!resposta.sucesso) {
        setErro(resposta.mensagem || 'Não foi possível enviar o cadastro.');
        return;
      }

      setEnviado(true);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Erro inesperado ao enviar o cadastro.');
    } finally {
      setEnviando(false);
    }
  }

  if (carregandoConfig) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (enviado) {
    return (
      <View style={styles.centralizado}>
        <View style={styles.iconeSucesso}>
          <Text style={styles.iconeSucessoTexto}>✓</Text>
        </View>
        <Text style={styles.tituloSucesso}>Cadastro enviado!</Text>
        <Text style={styles.subtituloSucesso}>
          A coordenação precisa aprovar seu cadastro antes de você poder vincular este
          celular. Volte aqui e vincule assim que tiver o código.
        </Text>
        <TouchableOpacity style={styles.botao} onPress={onVoltar}>
          <Text style={styles.textoBotao}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Criar cadastro</Text>
        <Text style={styles.subtitulo}>
          Preencha seus dados. A coordenação vai revisar antes de liberar o vínculo deste
          celular.
        </Text>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Endereço da API da escola</Text>
          <View style={styles.linhaBusca}>
            <TextInput
              style={[styles.input, styles.inputBusca]}
              placeholder="https://escola-exemplo.com/BioFrequenciaApi/"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              value={baseUrl}
              onChangeText={(texto) => {
                setBaseUrlState(texto);
                setSalas(null);
              }}
              editable={!enviando && !carregandoSalas}
            />
            <TouchableOpacity
              style={[styles.botaoBusca, carregandoSalas && styles.botaoDesabilitado]}
              onPress={handleBuscarTurmas}
              disabled={carregandoSalas}
            >
              {carregandoSalas ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.textoBotaoBusca}>Buscar turmas</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Nome completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome completo"
            placeholderTextColor="#9ca3af"
            value={nome}
            onChangeText={setNome}
            editable={!enviando}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Turma</Text>
          {salas === null ? (
            <Text style={styles.dica}>Busque as turmas acima primeiro.</Text>
          ) : salas.length === 0 ? (
            <Text style={styles.dica}>Nenhuma turma cadastrada nesta escola ainda.</Text>
          ) : (
            <View style={styles.grade}>
              {salas.map((sala) => (
                <TouchableOpacity
                  key={sala.id_sala}
                  style={[styles.chip, idSala === sala.id_sala && styles.chipSelecionado]}
                  onPress={() => setIdSala(sala.id_sala)}
                  disabled={enviando}
                >
                  <Text
                    style={[
                      styles.textoChip,
                      idSala === sala.id_sala && styles.textoChipSelecionado,
                    ]}
                  >
                    {sala.nome_sala}
                    {sala.periodo_sala ? ` (${sala.periodo_sala})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Data de nascimento</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            maxLength={10}
            value={dataNascimento}
            onChangeText={setDataNascimento}
            editable={!enviando}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Gênero</Text>
          <View style={styles.grade}>
            {GENEROS_ALUNO.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, genero === g && styles.chipSelecionado]}
                onPress={() => setGenero(g)}
                disabled={enviando}
              >
                <Text style={[styles.textoChip, genero === g && styles.textoChipSelecionado]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {erro ? (
          <View style={styles.avisoErro}>
            <Text style={styles.textoErro}>{erro}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.botao, enviando && styles.botaoDesabilitado]}
          onPress={handleEnviar}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.textoBotao}>Enviar cadastro</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoCancelar} onPress={onVoltar} disabled={enviando}>
          <Text style={styles.textoBotaoCancelar}>Cancelar</Text>
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
    padding: 24,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 28,
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
  linhaBusca: {
    flexDirection: 'row',
    gap: 8,
  },
  inputBusca: {
    flex: 1,
  },
  botaoBusca: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotaoBusca: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  chipSelecionado: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  textoChip: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  textoChipSelecionado: {
    color: '#fff',
  },
  dica: {
    fontSize: 13,
    color: '#94a3b8',
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
  botaoCancelar: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  textoBotaoCancelar: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  iconeSucesso: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconeSucessoTexto: {
    fontSize: 30,
    color: '#15803d',
    fontWeight: '700',
  },
  tituloSucesso: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtituloSucesso: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
});
