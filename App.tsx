import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import CriarContaScreen from './src/screens/CriarContaScreen';
import CheckinScreen from './src/screens/CheckinScreen';
import OcorrenciaScreen from './src/screens/OcorrenciaScreen';
import { limparVinculo, obterDispositivoVinculado } from './src/storage/deviceStorage';
import type { DispositivoVinculado } from './src/types';

/** Sem conta conectada: login ou cadastro. */
type TelaSemConta = 'entrar' | 'criar';
/** Com o celular conectado: check-in de chegada ou registro de ocorrência. */
type TelaComConta = 'checkin' | 'ocorrencia';

/**
 * App de telas sem biblioteca de navegação: sem conexão salva no
 * SecureStore, mostra o login (ou o cadastro); com ela - salva no login,
 * no cadastro ou carregada ao abrir o app - mostra o check-in.
 *
 * Não existe tela pedindo URL nem token: o endereço da API vem do build
 * (app.config.ts -> src/config.ts) e a identidade do aluno vem da conta
 * dele. O código de vínculo gerado pela coordenação deixou de existir.
 */
export default function App() {
  const [carregando, setCarregando] = useState(true);
  const [dispositivo, setDispositivo] = useState<DispositivoVinculado | null>(null);
  const [telaSemConta, setTelaSemConta] = useState<TelaSemConta>('entrar');
  const [telaComConta, setTelaComConta] = useState<TelaComConta>('checkin');
  const [avisoLogin, setAvisoLogin] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const salvo = await obterDispositivoVinculado();
      setDispositivo(salvo);
      setCarregando(false);
    })();
  }, []);

  function conectar(novo: DispositivoVinculado) {
    setAvisoLogin(null);
    setTelaComConta('checkin');
    setDispositivo(novo);
  }

  /** "Sair", ou a API avisou que o celular foi desconectado (aviso). */
  async function sair(aviso?: string) {
    await limparVinculo();
    setAvisoLogin(aviso ?? null);
    setTelaSemConta('entrar');
    setDispositivo(null);
  }

  if (carregando) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color="#2563eb" />
        <StatusBar style="auto" />
      </View>
    );
  }

  let tela: React.ReactNode;
  if (dispositivo) {
    tela =
      telaComConta === 'ocorrencia' ? (
        <OcorrenciaScreen dispositivo={dispositivo} onVoltar={() => setTelaComConta('checkin')} onSair={sair} />
      ) : (
        <CheckinScreen
          dispositivo={dispositivo}
          onSair={sair}
          onRegistrarOcorrencia={() => setTelaComConta('ocorrencia')}
        />
      );
  } else if (telaSemConta === 'criar') {
    tela = <CriarContaScreen onConectado={conectar} onVoltar={() => setTelaSemConta('entrar')} />;
  } else {
    tela = <LoginScreen onConectado={conectar} onCriarConta={() => setTelaSemConta('criar')} aviso={avisoLogin} />;
  }

  return (
    <View style={styles.container}>
      {tela}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centralizado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
});
