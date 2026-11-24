package expo.modules.leitordigital

import android.content.Context
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager

/**
 * O que a digital lida pelo leitor vira: o "template" (um resumo
 * matemático da digital, não a imagem), em base64, e o formato dele -
 * a API guarda exatamente isso (biometria/cadastrarBiometriaDigital.php).
 */
data class AmostraDigital(
  val templateBase64: String,
  /** Ex.: "ISO 19794-2", "ANSI 378" ou o formato próprio do SDK. */
  val formato: String,
  /** Qualidade da leitura (0 a 100), se o SDK informar. */
  val qualidade: Int? = null
)

/**
 * Contrato de um leitor de digital. É a ÚNICA parte que depende do
 * fabricante: cada SDK (SecuGen, Futronic, DigitalPersona...) vira uma
 * classe que implementa esta interface e é registrada em
 * DriversInstalados.kt. O resto - detectar o leitor ao ligar no USB, pedir a
 * permissão, cadastrar a digital do aluno, baixar as digitais da escola,
 * identificar e registrar a presença - já está pronto no app.
 *
 * Os métodos rodam fora da thread principal (o app chama por AsyncFunction).
 */
interface DriverLeitorDigital {
  /** Identificador curto, ex.: "secugen-hamster". */
  val id: String

  /** Nome que aparece na tela, ex.: "SecuGen Hamster Pro 20". */
  val nome: String

  /**
   * Pontuação mínima de comparar() para dizer "é este aluno". Cada SDK tem
   * a sua escala; use o valor que o fabricante recomenda para 1:N.
   */
  val pontuacaoMinima: Int

  /** Este driver sabe falar com este aparelho? (normalmente pelo vendorId/productId). */
  fun reconhece(dispositivo: UsbDevice): Boolean

  /**
   * Abre o leitor (a permissão USB já foi dada), espera o dedo e devolve
   * o template. Lança exceção com uma mensagem legível se não conseguir
   * (ex.: "Dedo mal posicionado, tente de novo").
   */
  fun capturar(contexto: Context, usb: UsbManager, dispositivo: UsbDevice, tempoLimiteMs: Long): AmostraDigital

  /** Compara duas amostras do mesmo formato e devolve a pontuação (maior = mais parecida). */
  fun comparar(amostra: AmostraDigital, candidata: AmostraDigital): Int

  /** Fecha o leitor (chamado ao desconectar ou ao sair do app). */
  fun fechar() {}
}

/** Os drivers que este build do app conhece (preenchido por DriversInstalados). */
object Drivers {
  private val lista = mutableListOf<DriverLeitorDigital>()

  @Synchronized
  fun registrar(driver: DriverLeitorDigital) {
    if (lista.none { it.id == driver.id }) lista.add(driver)
  }

  @Synchronized
  fun todos(): List<DriverLeitorDigital> = lista.toList()

  fun para(dispositivo: UsbDevice): DriverLeitorDigital? = todos().firstOrNull { it.reconhece(dispositivo) }
}
