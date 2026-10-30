# BioFrequência — App do aluno (Expo / React Native)

App Android/iOS para o aluno confirmar a chegada (check-in) e enviar
faltas/atrasos com justificativa, confirmando a identidade com a
biometria ou o PIN do próprio celular. Arquitetura geral:
`docs/ARQUITETURA.md` no repositório da API.

## Como funciona

1. A coordenação cadastra o aluno no site (nome, turma, data de
   nascimento).
2. No primeiro acesso, o aluno toca em **Criar conta** e informa o nome e
   a data de nascimento iguais aos do cadastro da escola (vale o nome
   completo ou o primeiro e o último nome), um e-mail e uma senha. A API
   só cria a conta para um aluno que a escola já cadastrou, uma por aluno.
   Depois disso ele usa **Entrar** (e-mail e senha) em qualquer celular.
3. O login conecta o celular à conta: a API devolve um segredo do
   aparelho, guardado no Keystore/Keychain (`expo-secure-store`); a senha
   não fica no celular. Um celular por vez - entrar em outro desconecta o
   anterior, que volta sozinho para a tela de login.
4. Cada envio pede a confirmação de identidade ao sistema
   (`src/biometria.ts`): digital, rosto ou o bloqueio de tela. **Nada
   biométrico sai do celular** - a API recebe só o envio assinado com
   HMAC-SHA256 (`src/crypto/hmac.ts`).
5. Check-ins e ocorrências ficam pendentes até a coordenação confirmar no
   site. Na página do aluno, a coordenação vê a conta, desconecta o
   celular ou remove a conta (se foi criada por outra pessoa).

Isto substituiu o código de vínculo de 8 caracteres que a coordenação
gerava no site.

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
npm test                 # test/*.test.ts: endereço por build, biometria, HMAC
npx expo install --check # versões compatíveis com o SDK
```

## O que só pode ser validado num celular físico

Criar conta, entrar, check-in e ocorrência ponta a ponta contra a API
publicada, e os casos de biometria: celular sem biometria só com PIN,
cancelar a confirmação, bloqueio por muitas tentativas.
