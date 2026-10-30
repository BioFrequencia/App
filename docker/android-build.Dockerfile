# Ambiente de build do APK equivalente ao runner do GitHub usado pelo job
# "apk-local" (.github/workflows/android.yml): Node 22, JDK 17 e Android
# SDK 36 / build-tools 36.0.0 / NDK 27.1 (versões exigidas pelo React
# Native 0.86 / Expo 57). Usado por scripts/build-apk-docker.sh.
FROM node:22-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends openjdk-17-jdk-headless unzip \
 && rm -rf /var/lib/apt/lists/*

ENV ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

RUN mkdir -p $ANDROID_HOME/cmdline-tools \
 && curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/ct.zip \
 && unzip -q /tmp/ct.zip -d $ANDROID_HOME/cmdline-tools \
 && mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest \
 && rm /tmp/ct.zip \
 && yes | sdkmanager --licenses > /dev/null \
 && sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006" "cmake;3.22.1" > /dev/null

WORKDIR /build
