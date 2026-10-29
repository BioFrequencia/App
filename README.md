# BioFrequência — App do aluno (Expo / React Native)

App Android/iOS para o aluno confirmar a chegada (check-in) e enviar
faltas/atrasos com justificativa, confirmando a identidade com a
biometria ou o PIN do próprio celular. Arquitetura geral:
`docs/ARQUITETURA.md` no repositório da API.

## Como funciona

1. A coordenação cadastra o aluno no site e gera um **código de vínculo**
   (8 caracteres, vale 15 minutos, uso único).
2. O aluno digita o código no app. A API devolve um segredo do aparelho,
   guardado no Keystore/Keychain (`expo-secure-store`).
3. Cada envio pede a confirmação de identidade ao sistema
   (`src/biometria.ts`): digital, rosto ou o bloqueio de tela. **Nada
   biométrico sai do celular** - a API recebe só o envio assinado com
   HMAC-SHA256 (`src/crypto/hmac.ts`).
4. Check-ins e ocorrências ficam pendentes até a coordenação confirmar no
   site.

## Endereço da API

Definido no build por `app.config.ts` (`expo.extra.apiBaseUrl`):

| Build | Endereço |
|---|---|
| EAS `preview`/`production`, ou `APP_ENV=preview/production` | `API_URL`, ou `https://biofrequencia-api.onrender.com/`. Endereço local ou sem HTTPS **faz o build falhar**. |
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

- **GitHub Actions** (`.github/workflows/android.yml`): em pull request e
  na master gera o APK (`biofrequencia.apk`) como artifact; na master
  também o publica na release `app-mais-recente`, que é o link da página
  de downloads do site.
- **EAS** (se o segredo `EXPO_TOKEN` existir): `preview` (APK interno) a
  cada push na master; `production` só pelo botão "Run workflow".

```bash
eas build --platform android --profile preview      # APK para testes
eas build --platform android --profile production   # AAB para a loja
```

## Testes e verificação

```bash
npm ci
npm run typecheck
npm test                 # test/*.test.ts: endereço por build, biometria, HMAC
npx expo install --check # versões compatíveis com o SDK
```

## O que só pode ser validado num celular físico

Vínculo com o código, check-in e ocorrência ponta a ponta contra a API
publicada, e os casos de biometria: celular sem biometria só com PIN,
cancelar a confirmação, bloqueio por muitas tentativas.
