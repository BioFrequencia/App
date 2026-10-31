# BioFrequência — App de biometria da coordenação (Expo / React Native)

App Android (tablets e celulares da escola) para a coordenação cadastrar
a biometria dos alunos e identificá-los na chegada: reconhecido o aluno,
a presença é registrada sozinha no sistema e aparece no site. Arquitetura
geral: `docs/ARQUITETURA.md` no repositório da API.

## Como funciona

1. **Entrar** com a conta da coordenação - a mesma do site. O app só vê
   os alunos da escola dessa conta (cada coordenação é uma escola
   independente). A sessão dura 12 horas e fica no Keystore
   (`expo-secure-store`); a senha não é guardada.
2. **Cadastrar biometria**: busca o aluno (nome, turma), confere nome e
   data de nascimento, registra o consentimento do responsável (LGPD) e
   tira três fotos do rosto.
3. **Identificar aluno**: um toque tira a foto; o rosto é reconhecido
   entre os alunos da escola e a presença do dia fica registrada. Mostra
   claramente: registrada, já registrada antes, não reconhecido ou foto
   ruim (sem rosto, mais de um rosto, longe demais).
4. **Registros do dia**: presentes (horário e forma) e quem ainda falta,
   com registro manual quando o reconhecimento não resolver.

### Reconhecimento facial no aparelho

O modelo roda **no próprio tablet**: `face/motor.js` com a face-api.js
(detecção, 68 pontos do rosto e rede ResNet-34 que gera um vetor de 128
números), numa WebView escondida (`src/face/MotorFacial.tsx`). A foto
nunca sai do aparelho e os arquivos temporários são apagados
(`src/face/captura.ts`); só o vetor vai para a API, que o guarda
**cifrado** e faz a comparação entre os alunos da escola. Os modelos
(~13 MB, licença MIT) vêm do pacote `@vladmandic/face-api` e entram no
APK pelo plugin `plugins/comMotorFacial.js` durante o `expo prebuild`.

### Digital

O sensor de digital do próprio celular não serve para identificar alunos:
o Android só confirma o dono do aparelho e não entrega a digital de
ninguém ao app. A API já guarda digitais cifradas e registra presença pela
digital; falta integrar o SDK do leitor USB que a escola escolher (o app
mostra "Leitor de digital não conectado" enquanto isso).

### Prévia no navegador

`API_URL=http://localhost:8080/ npx expo start --web` abre as telas no
navegador para conferir layout e fluxos (login, alunos, consentimento,
registros) contra a API local. O reconhecimento facial e a câmera de
verdade só funcionam no APK Android.

## Endereço da API

Definido no build por `app.config.ts` (`expo.extra.apiBaseUrl`):

| Build | Endereço |
|---|---|
| EAS `preview`/`production`, ou `APP_ENV=preview/production` | `API_URL`, ou `https://api-4ins.onrender.com/`. Endereço local ou sem HTTPS **faz o build falhar**. |
| `npx expo start` (desenvolvimento) | `API_URL`, ou `http://10.0.2.2/BioFrequenciaApi/` (XAMPP visto do emulador Android). Num celular físico, use `API_URL=http://IP-do-computador/BioFrequenciaApi/`. |

Se o serviço no Render tiver outra URL, defina a variável `API_URL` no
repositório (Settings → Secrets and variables → Actions → Variables) e
nas variáveis de ambiente do projeto no EAS.

## Versões

- **Versão que o usuário vê**: `version` em `app.json` (ex.: `1.0.0`),
  trocada à mão a cada entrega.
- **Número do build** (`versionCode`): no EAS é controlado pelo próprio
  EAS (`appVersionSource: "remote"` + `autoIncrement` em `eas.json`); no
  APK do GitHub Actions é o número da execução do workflow.

## Builds

- **GitHub Actions** (`.github/workflows/android.yml`): em pull request,
  na master e pelo botão "Run workflow" (Actions → Aplicativo Android →
  escolher a branch) gera o APK (`biofrequencia.apk`) como artifact
  `biofrequencia-app`; na master também o publica na release
  `app-mais-recente`, que é o link da página de downloads do site.
- **EAS** (se o segredo `EXPO_TOKEN` existir): `preview` (APK interno) a
  cada push na master; `production` só pelo botão "Run workflow".
- **Local, com Docker** (sem Android Studio, Java ou SDK instalados): os
  mesmos passos do job do GitHub, a partir do código commitado. A primeira
  execução leva de 20 a 40 minutos (baixa SDK, NDK e dependências do
  Gradle, que ficam em cache para as próximas).

```bash
eas build --platform android --profile preview      # APK para testes
eas build --platform android --profile production   # AAB para a loja
sh scripts/build-apk-docker.sh                      # gera apk/biofrequencia.apk
```

O APK gerado fora do EAS é assinado com a chave de debug do template do
Expo: serve para instalar e testar (permitindo "fontes desconhecidas"),
não para publicar na Play Store.

## Testes e verificação

```bash
npm ci
npm run typecheck
npm test                 # test/*.test.ts: endereço, sessão, datas, busca, motor facial
npx expo install --check # versões compatíveis com o SDK
```

## O que só pode ser validado num aparelho Android

O reconhecimento de rostos de verdade: carregar o motor (alguns segundos
ao abrir o app), cadastrar e reconhecer alunos com a câmera, em luz boa e
ruim, e o tempo de cada identificação. O limite de distância (0,5 na API,
`DISTANCIA_MAXIMA_FACIAL`) deve ser calibrado com fotos reais da escola
antes do uso diário.
