import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { definirAoExpirar, definirToken } from './src/api/client';
import { MotorFacialProvider } from './src/face/MotorFacial';
import type { Navegacao, Rota } from './src/navegacao';
import { apagarSessao, carregarSessao } from './src/sessao';
import type { Sessao } from './src/types';
import { Carregando } from './src/ui/componentes';
import { cores } from './src/ui/tema';
import LoginTela from './src/telas/LoginTela';
import InicioTela from './src/telas/InicioTela';
import IdentificarTela from './src/telas/IdentificarTela';
import AlunosTela from './src/telas/AlunosTela';
import AlunoTela from './src/telas/AlunoTela';
import CapturaFacialTela from './src/telas/CapturaFacialTela';
import RegistrosTela from './src/telas/RegistrosTela';

/**
 * App de biometria da coordenação: entra com a conta da coordenação (a
 * mesma do site), cadastra a biometria dos alunos e identifica cada um na
 * chegada, registrando a presença sozinho no sistema.
 *
 * Telas numa pilha simples, sem biblioteca de navegação; o botão "voltar"
 * do Android desempilha. O motor facial é montado uma vez, aqui, para os
 * modelos já estarem carregados quando a coordenação entrar.
 */
export default function App() {
  const [fontesProntas] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  // undefined: ainda lendo a sessão guardada.
  const [sessao, setSessao] = useState<Sessao | null | undefined>(undefined);
  const [avisoLogin, setAvisoLogin] = useState<string | null>(null);
  const [pilha, setPilha] = useState<Rota[]>([{ nome: 'inicio' }]);

  useEffect(() => {
    carregarSessao().then((guardada) => {
      definirToken(guardada?.token ?? null);
      setSessao(guardada);
    });
  }, []);

  const encerrar = useCallback(async (aviso: string | null) => {
    await apagarSessao();
    definirToken(null);
    setAvisoLogin(aviso);
    setPilha([{ nome: 'inicio' }]);
    setSessao(null);
  }, []);

  useEffect(() => {
    definirAoExpirar(() => encerrar('Sua sessão terminou. Entre de novo com a conta da coordenação.'));
    return () => definirAoExpirar(null);
  }, [encerrar]);

  const voltar = useCallback(() => setPilha((atual) => (atual.length > 1 ? atual.slice(0, -1) : atual)), []);

  useEffect(() => {
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pilha.length > 1) {
        voltar();
        return true;
      }
      return false;
    });
    return () => assinatura.remove();
  }, [pilha.length, voltar]);

  let tela: React.ReactNode;
  if (!fontesProntas || sessao === undefined) {
    tela = <Carregando />;
  } else if (sessao === null) {
    tela = (
      <LoginTela
        aviso={avisoLogin}
        aoEntrar={(nova) => {
          setAvisoLogin(null);
          setPilha([{ nome: 'inicio' }]);
          setSessao(nova);
        }}
      />
    );
  } else {
    const nav: Navegacao = {
      sessao,
      navegar: (rota) => setPilha((atual) => [...atual, rota]),
      voltar,
      sair: () => encerrar(null),
    };
    const rota = pilha[pilha.length - 1];
    switch (rota.nome) {
      case 'identificar':
        tela = <IdentificarTela nav={nav} />;
        break;
      case 'alunos':
        tela = <AlunosTela nav={nav} />;
        break;
      case 'aluno':
        tela = <AlunoTela key={rota.aluno.id_aluno} nav={nav} aluno={rota.aluno} />;
        break;
      case 'capturaFacial':
        tela = <CapturaFacialTela nav={nav} aluno={rota.aluno} />;
        break;
      case 'registros':
        tela = <RegistrosTela nav={nav} />;
        break;
      default:
        tela = <InicioTela nav={nav} />;
    }
  }

  return (
    <SafeAreaProvider>
      <MotorFacialProvider>
        <View style={estilos.raiz}>{tela}</View>
      </MotorFacialProvider>
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.nevoa100 },
});
