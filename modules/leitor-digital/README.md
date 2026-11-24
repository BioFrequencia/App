# Leitor de digital USB

Módulo nativo do app (Android) que deixa o leitor de digital "ligou, funcionou".

## O que já está pronto

- **Ao conectar o leitor** (cabo OTG), o Android oferece abrir o BioFrequência e já dá a permissão de uso. O filtro vem de `leitores.json` (o `vendorId` USB de cada fabricante) pelo plugin `plugins/comLeitorDigital.js`.
- **As telas acompanham sozinhas** as mudanças: conectado, desconectado e permissão dada. `LeitorDigitalModule.kt` avisa o JavaScript pelo evento `aoMudarConexao`.
- **Cadastro**: na ficha do aluno, com o consentimento registrado, a pessoa escolhe o dedo e toca em *Cadastrar digital*. A API guarda o template cifrado (`biometria/cadastrarBiometriaDigital.php`).
- **Identificação**: em *Identificar aluno › Digital*, o app baixa as digitais da escola (`biometria/templatesDigitais.php`, com cache de 10 minutos). O leitor compara 1:N no próprio tablet e a presença é registrada com `metodo: digital`. A entrada atrasada vale como na facial.
- **Situações** que a tela explica:
  - sem suporte (prévia web);
  - nenhum leitor conectado;
  - leitor reconhecido mas sem driver;
  - falta permitir;
  - pronto.

## O que falta: o driver do fabricante

Cada fabricante tem o seu SDK, com o próprio algoritmo de leitura e de comparação, e uma licença própria. Por isso o driver entra quando a escola escolher o modelo. São quatro passos:

1. **Coloque o SDK no módulo.** Copie o `.aar` do fabricante para `modules/leitor-digital/android/libs/` e acrescente em `android/build.gradle`:

   ```gradle
   dependencies {
     implementation files('libs/sdk-do-fabricante.aar')
   }
   ```

2. **Escreva o driver.** Crie `android/src/main/java/expo/modules/leitordigital/<Fabricante>Driver.kt` implementando `DriverLeitorDigital`:

   ```kotlin
   class SecugenDriver : DriverLeitorDigital {
     override val id = "secugen"
     override val nome = "SecuGen Hamster Pro 20"
     override val pontuacaoMinima = 100 // o valor que o SDK recomenda para 1:N

     override fun reconhece(dispositivo: UsbDevice) = dispositivo.vendorId == 0x1162

     override fun capturar(contexto: Context, usb: UsbManager, dispositivo: UsbDevice, tempoLimiteMs: Long): AmostraDigital {
       // abrir o leitor com o SDK, esperar o dedo, gerar o template ISO 19794-2
       return AmostraDigital(Base64.encodeToString(template, Base64.NO_WRAP), "ISO 19794-2", qualidade)
     }

     override fun comparar(amostra: AmostraDigital, candidata: AmostraDigital): Int {
       // a função de "match" do SDK; devolve a pontuação
     }
   }
   ```

   Lance uma exceção com uma mensagem legível quando a leitura falhar, por exemplo `"Dedo mal posicionado, tente de novo"`. Ela aparece na tela.

3. **Registre o driver** em `DriversInstalados.kt`, com a linha `Drivers.registrar(SecugenDriver())`.

4. **Confira o fabricante** em `leitores.json`. O `vendorId` do leitor precisa estar lá: sem ele, o Android não oferece abrir o app ao conectar. Na tela, o leitor aparece como "não reconhecido".

Depois, gere o APK como sempre: `sh scripts/build-apk-docker.sh` ou o workflow do GitHub.

## Por que não o sensor do próprio tablet

O Android só deixa o app confirmar o **dono do aparelho** (`BiometricPrompt`). Ele não deixa o app ler, guardar nem comparar a digital de outras pessoas. Por isso a escola precisa de um leitor USB externo.
