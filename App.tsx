import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import PairingScreen from './src/screens/PairingScreen';
import CheckinScreen from './src/screens/CheckinScreen';
import OcorrenciaScreen from './src/screens/OcorrenciaScreen';
import { obterDispositivoVinculado } from './src/storage/deviceStorage';
import type { DispositivoVinculado } from './src/types';

/** Com o aparelho vinculado: check-in de chegada ou registro de ocorrência. */
type TelaComVinculo = 'checkin' | 'ocorrencia';

/**
 * App de telas sem biblioteca de navegação: se não houver nada no
 * SecureStore, mostra o vínculo; assim que um vínculo é salvo (ou
 * carregado ao abrir o app), mostra a tela de check-in.
 *
 * Não existe tela de configuração pedindo URL e token: o endereço da API
 * vem do build (app.config.ts -> src/config.ts) e a identidade do aluno
 * vem do vínculo do aparelho.
 *
 * O cadastro do aluno é feito pela coordenação (site/desktop), que depois
 * gera o código de vínculo. A tela "Cadastre-se" que existia aqui chamava
 * user/listarSalasPublico.php e aluno/cadastroPendente.php - endpoints que
 * nunca existiram na API (sempre 404) - e ainda pedia ao aluno o endereço
 * do servidor. Foi retirada.
 */
export default function App() {
  const [carregando, setCarregando] = useState(true);
  const [dispositivo, setDispositivo] = useState<DispositivoVinculado | null>(null);
  const [telaComVinculo, setTelaComVinculo] = useState<TelaComVinculo>('checkin');

  useEffect(() => {
    (async () => {
      const salvo = await obterDispositivoVinculado();
      setDispositivo(salvo);
      setCarregando(false);
    })();
  }, []);

  if (carregando) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color="#2563eb" />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {dispositivo ? (
        telaComVinculo === 'ocorrencia' ? (
          <OcorrenciaScreen
            dispositivo={dispositivo}
            onVoltar={() => setTelaComVinculo('checkin')}
          />
        ) : (
          <CheckinScreen
            dispositivo={dispositivo}
            onSair={() => setDispositivo(null)}
            onRegistrarOcorrencia={() => setTelaComVinculo('ocorrencia')}
          />
        )
      ) : (
        <PairingScreen onVinculado={setDispositivo} />
      )}
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
