#!/bin/sh
# Gera o APK localmente com Docker, com os mesmos passos do job
# "apk-local" do GitHub Actions - não precisa de Android Studio nem de
# Java/SDK instalados. Usa o código COMMITADO (git archive HEAD).
#
#   sh scripts/build-apk-docker.sh            # perfil preview (API do Render)
#   API_URL=https://outra-api/ sh scripts/build-apk-docker.sh
#
# Saída: apk/biofrequencia.apk (fora do Git). Primeira execução: 20-40 min
# (baixa SDK, NDK e dependências do Gradle, que ficam em cache no volume
# "biofrequencia-gradle").
set -e
cd "$(dirname "$0")/.."

# Caminho da pasta como o Docker entende: no Git Bash do Windows, "pwd -W"
# dá C:/...; no Linux e no macOS, vale o pwd normal.
caminho_host() { (cd "$1" && { pwd -W 2>/dev/null || pwd; }); }

trabalho=$(mktemp -d)
trap 'rm -rf "$trabalho"' EXIT
git archive HEAD | tar -x -C "$trabalho"
mkdir -p apk

docker build -t biofrequencia-android-build -f docker/android-build.Dockerfile docker

# MSYS_NO_PATHCONV: no Git Bash do Windows, impede que /build vire C:/...
MSYS_NO_PATHCONV=1 docker run --rm \
  -e CI=1 -e APP_ENV=preview -e ANDROID_VERSION_CODE="${ANDROID_VERSION_CODE:-1}" -e API_URL="${API_URL:-}" \
  -v "$(caminho_host "$trabalho"):/fonte:ro" \
  -v "$(caminho_host apk):/saida" \
  -v biofrequencia-gradle:/root/.gradle \
  biofrequencia-android-build sh -c '
    set -e
    cp -r /fonte /build/app && cd /build/app
    npm ci --no-audit --no-fund
    npx expo prebuild --platform android --no-install
    cd android && chmod +x gradlew
    # Limita os workers: o Docker Desktop costuma ter ~6 GB de memória.
    # Só ARM, como no workflow (ver o comentário em android.yml).
    ./gradlew assembleRelease --no-daemon --max-workers=4 -Dorg.gradle.jvmargs="-Xmx3g -XX:MaxMetaspaceSize=768m" \
      -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
    caminho=$(find app/build/outputs/apk -name "*.apk" | head -1)
    unzip -t "$caminho" > /dev/null
    cp "$caminho" /saida/biofrequencia.apk
  '
echo "APK: apk/biofrequencia.apk"
