import { StyleSheet } from 'react-native';

/** Visual comum das telas "Entrar" e "Criar conta". */
export const estilosConta = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 28,
    lineHeight: 21,
  },
  campo: {
    marginBottom: 16,
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
  avisoErro: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  textoErro: {
    color: '#b91c1c',
    fontSize: 14,
  },
  avisoInfo: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  textoInfo: {
    color: '#1e40af',
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
  link: {
    marginTop: 22,
    paddingVertical: 8,
    alignItems: 'center',
  },
  textoLink: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: '600',
    textAlign: 'center',
  },
  rodape: {
    marginTop: 16,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 17,
  },
});
