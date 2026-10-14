import CryptoJS from 'crypto-js';

/**
 * Assinatura HMAC-SHA256 de um check-in biométrico, byte-a-byte compatível
 * com `assinaturaCheckin()` em BioFrequenciaApi/helpers/dispositivo.php:
 *
 *   function assinaturaCheckin(string $deviceUuid, string $tipo, string $timestamp, string $segredo): string {
 *       return hash_hmac('sha256', "$deviceUuid|$tipo|$timestamp", $segredo);
 *   }
 *
 * Os três campos são unidos com "|" literal, nesta ordem, usando a mesma
 * string de timestamp que vai no corpo JSON (nunca uma recalculada). O
 * resultado é hex minúsculo, que é o que `hash_hmac()` do PHP também produz
 * e o que o servidor compara com `hash_equals()`.
 *
 * `expo-crypto` não expõe HMAC diretamente (só digest de hash simples), por
 * isso usamos `crypto-js`, que roda em puro JS e funciona sem módulos
 * nativos adicionais no React Native.
 */
export function assinarCheckin(
  deviceUuid: string,
  tipo: string,
  timestamp: string,
  deviceSecret: string
): string {
  const mensagem = `${deviceUuid}|${tipo}|${timestamp}`;
  return CryptoJS.HmacSHA256(mensagem, deviceSecret).toString(CryptoJS.enc.Hex);
}
