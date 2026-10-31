import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';

import { Botao, Carregando, Icone } from '../ui/componentes';
import { cores, fontes, raio } from '../ui/tema';

interface Props {
  /** Texto curto sobre o contorno do rosto (ex.: "Olhe para a câmera"). */
  instrucao?: string;
  /** Sobreposições (resultado, progresso) desenhadas por cima da câmera. */
  children?: React.ReactNode;
}

/**
 * Câmera com o contorno de onde o rosto deve ficar. Começa pela câmera da
 * frente (o aluno se vê na tela, como num totem); o botão no canto troca
 * para a traseira (a coordenação segurando o tablet). As fotos não são
 * guardadas - ver src/face/captura.ts.
 */
export const CameraComGuia = forwardRef<CameraView, Props>(function CameraComGuia({ instrucao, children }, ref) {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const [lado, setLado] = useState<CameraType>('front');

  if (!permissao) {
    return <Carregando texto="Abrindo a câmera…" />;
  }

  if (!permissao.granted) {
    return (
      <View style={estilos.semPermissao}>
        <Icone nome="camera-off" tamanho={36} cor={cores.tinta300} />
        <Text style={estilos.semPermissaoTitulo}>Permita o uso da câmera</Text>
        <Text style={estilos.semPermissaoTexto}>
          A câmera é usada para cadastrar e reconhecer o rosto dos alunos. As fotos não saem do aparelho e não ficam
          guardadas.
        </Text>
        <Botao titulo="Permitir câmera" icone="camera" aoPressionar={pedirPermissao} />
      </View>
    );
  }

  return (
    <View style={estilos.moldura}>
      <CameraView ref={ref} style={StyleSheet.absoluteFill} facing={lado} />
      <View style={estilos.guiaArea} pointerEvents="none">
        <View style={estilos.oval} />
        {instrucao ? (
          <View style={estilos.instrucao}>
            <Text style={estilos.instrucaoTexto}>{instrucao}</Text>
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={() => setLado((atual) => (atual === 'front' ? 'back' : 'front'))}
        style={estilos.trocar}
        accessibilityRole="button"
        accessibilityLabel={lado === 'front' ? 'Usar a câmera traseira' : 'Usar a câmera da frente'}
        hitSlop={8}
      >
        <Icone nome="refresh-cw" tamanho={18} cor="#ffffff" />
      </Pressable>
      {children}
    </View>
  );
});

const estilos = StyleSheet.create({
  moldura: { flex: 1, borderRadius: raio.grande, overflow: 'hidden', backgroundColor: cores.tinta900 },
  guiaArea: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  oval: {
    width: '58%', maxWidth: 300, aspectRatio: 0.78, borderRadius: 999,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)', borderStyle: 'dashed',
  },
  instrucao: {
    position: 'absolute', top: 18, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(33,31,43,0.72)',
  },
  instrucaoTexto: { fontFamily: fontes.textoSemi, fontSize: 14, color: '#ffffff' },
  trocar: {
    position: 'absolute', top: 14, right: 14, width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(33,31,43,0.6)',
  },
  semPermissao: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28,
    backgroundColor: cores.superficie, borderRadius: raio.grande, borderWidth: 1, borderColor: cores.nevoa200,
  },
  semPermissaoTitulo: { fontFamily: fontes.tituloMedio, fontSize: 18, color: cores.tinta900 },
  semPermissaoTexto: { fontFamily: fontes.texto, fontSize: 14, lineHeight: 20, color: cores.tinta500, textAlign: 'center', maxWidth: 420 },
});
