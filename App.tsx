import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import PairingScreen from './src/screens/PairingScreen';
import CadastroScreen from './src/screens/CadastroScreen';
import CheckinScreen from './src/screens/CheckinScreen';
import { obterDispositivoVinculado } from './src/storage/deviceStorage';
import type { DispositivoVinculado } from './src/types';

type TelaSemVinculo = 'pareamento' | 'cadastro';

/**
 * App de telas sem biblioteca de navegação: se não houver nada no
 * SecureStore, mostra vínculo (ou cadastro, pra quem ainda não tem
 * registro); assim que um vínculo é salvo (ou carregado ao abrir o app),
 * mostra a tela de check-in.
 */
export default function App() {
  const [carregando, setCarregando] = useState(true);
  const [dispositivo, setDispositivo] = useState<DispositivoVinculado | null>(null);
  const [telaSemVinculo, setTelaSemVinculo] = useState<TelaSemVinculo>('pareamento');

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
        <CheckinScreen dispositivo={dispositivo} onSair={() => setDispositivo(null)} />
      ) : telaSemVinculo === 'cadastro' ? (
        <CadastroScreen onVoltar={() => setTelaSemVinculo('pareamento')} />
      ) : (
        <PairingScreen
          onVinculado={setDispositivo}
          onIrParaCadastro={() => setTelaSemVinculo('cadastro')}
        />
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
