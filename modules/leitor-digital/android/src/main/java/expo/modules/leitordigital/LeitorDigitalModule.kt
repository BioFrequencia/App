package expo.modules.leitordigital

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val ACAO_PERMISSAO = "br.com.biofrequencia.LEITOR_DIGITAL_PERMISSAO"
private const val EVENTO_CONEXAO = "aoMudarConexao"

class LeitorDigitalException(mensagem: String, causa: Throwable? = null) :
  CodedException("ERR_LEITOR_DIGITAL", mensagem, causa)

/**
 * Leitor de digital USB (OTG) para o app: a parte que NÃO depende do
 * fabricante. Lista os aparelhos USB ligados, avisa o JavaScript quando um
 * é conectado ou desconectado, pede a permissão do Android e repassa a
 * leitura e a comparação ao driver do fabricante (DriverLeitorDigital),
 * quando houver um instalado para aquele aparelho.
 */
class LeitorDigitalModule : Module() {
  private var receptor: BroadcastReceiver? = null
  private var permissaoPendente: Promise? = null

  private val contexto: Context
    get() = appContext.reactContext ?: throw LeitorDigitalException("O app ainda não terminou de abrir.")

  private val usb: UsbManager
    get() = contexto.getSystemService(Context.USB_SERVICE) as UsbManager

  override fun definition() = ModuleDefinition {
    Name("LeitorDigital")
    Events(EVENTO_CONEXAO)

    OnCreate {
      DriversInstalados.carregar()
      registrarReceptor()
    }

    OnDestroy {
      receptor?.let { runCatching { contexto.unregisterReceiver(it) } }
      receptor = null
      Drivers.todos().forEach { runCatching { it.fechar() } }
    }

    /** Aparelhos USB ligados agora, com o driver que sabe falar com cada um (se houver). */
    Function("listarDispositivos") {
      usb.deviceList.values.map { descrever(it) }
    }

    /** Os drivers de fabricante que este build do app traz. */
    Function("driversInstalados") {
      Drivers.todos().map { mapOf("id" to it.id, "nome" to it.nome) }
    }

    /** Pede ao Android a permissão de usar o aparelho (a janela "Permitir acesso ao dispositivo USB?"). */
    AsyncFunction("pedirPermissao") { nomeDispositivo: String, promise: Promise ->
      val dispositivo = acharDispositivo(nomeDispositivo)
      if (usb.hasPermission(dispositivo)) {
        promise.resolve(true)
        return@AsyncFunction
      }
      permissaoPendente?.resolve(false)
      permissaoPendente = promise
      val intencao = Intent(ACAO_PERMISSAO).setPackage(contexto.packageName)
      val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
      usb.requestPermission(dispositivo, PendingIntent.getBroadcast(contexto, 0, intencao, flags))
    }

    /** Lê o dedo no leitor e devolve o template (base64) e o formato. */
    AsyncFunction("capturar") { nomeDispositivo: String, tempoLimiteMs: Double ->
      val dispositivo = acharDispositivo(nomeDispositivo)
      val driver = driverDe(dispositivo)
      if (!usb.hasPermission(dispositivo)) {
        throw LeitorDigitalException("Falta permitir o acesso ao leitor. Desconecte e conecte de novo e toque em Permitir.")
      }
      val amostra = try {
        driver.capturar(contexto, usb, dispositivo, tempoLimiteMs.toLong())
      } catch (erro: LeitorDigitalException) {
        throw erro
      } catch (erro: Exception) {
        throw LeitorDigitalException(erro.message ?: "Não foi possível ler a digital. Tente de novo.", erro)
      }
      mapOf("template" to amostra.templateBase64, "formato" to amostra.formato, "qualidade" to amostra.qualidade)
    }

    /**
     * Procura a amostra entre as digitais da escola (1:N, no aparelho, com o
     * algoritmo do fabricante). Devolve o melhor candidato acima da
     * pontuação mínima do driver, ou null.
     */
    AsyncFunction("identificar") { nomeDispositivo: String, template: String, formato: String,
                                   ids: List<Int>, templates: List<String>, formatos: List<String> ->
      val driver = driverDe(acharDispositivo(nomeDispositivo))
      val amostra = AmostraDigital(template, formato)
      var melhorId: Int? = null
      var melhorPontuacao = Int.MIN_VALUE
      for (i in ids.indices) {
        if (formatos.getOrNull(i) != formato) continue
        val pontuacao = runCatching { driver.comparar(amostra, AmostraDigital(templates[i], formatos[i])) }.getOrNull() ?: continue
        if (pontuacao > melhorPontuacao) {
          melhorPontuacao = pontuacao
          melhorId = ids[i]
        }
      }
      if (melhorId == null || melhorPontuacao < driver.pontuacaoMinima) {
        null
      } else {
        mapOf("id_aluno" to melhorId, "pontuacao" to melhorPontuacao, "minima" to driver.pontuacaoMinima)
      }
    }
  }

  private fun descrever(dispositivo: UsbDevice): Map<String, Any?> {
    val driver = Drivers.para(dispositivo)
    return mapOf(
      "nome" to dispositivo.deviceName,
      "vendorId" to dispositivo.vendorId,
      "productId" to dispositivo.productId,
      "fabricante" to runCatching { dispositivo.manufacturerName }.getOrNull(),
      "produto" to runCatching { dispositivo.productName }.getOrNull(),
      "permitido" to usb.hasPermission(dispositivo),
      "driver" to driver?.let { mapOf("id" to it.id, "nome" to it.nome) }
    )
  }

  private fun acharDispositivo(nome: String): UsbDevice =
    usb.deviceList[nome] ?: throw LeitorDigitalException("O leitor foi desconectado. Ligue de novo no tablet.")

  private fun driverDe(dispositivo: UsbDevice): DriverLeitorDigital =
    Drivers.para(dispositivo)
      ?: throw LeitorDigitalException("Este leitor ainda não tem o driver do fabricante instalado no app.")

  private fun registrarReceptor() {
    if (receptor != null) return
    val filtro = IntentFilter().apply {
      addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
      addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
      addAction(ACAO_PERMISSAO)
    }
    val novo = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
          ACAO_PERMISSAO -> {
            val permitido = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
            permissaoPendente?.resolve(permitido)
            permissaoPendente = null
            sendEvent(EVENTO_CONEXAO, mapOf("motivo" to "permissao"))
          }
          UsbManager.ACTION_USB_DEVICE_ATTACHED -> sendEvent(EVENTO_CONEXAO, mapOf("motivo" to "conectado"))
          UsbManager.ACTION_USB_DEVICE_DETACHED -> {
            Drivers.todos().forEach { runCatching { it.fechar() } }
            sendEvent(EVENTO_CONEXAO, mapOf("motivo" to "desconectado"))
          }
        }
      }
    }
    // Só transmissões do sistema e do próprio app (a da permissão é do app).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      contexto.registerReceiver(novo, filtro, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      contexto.registerReceiver(novo, filtro)
    }
    receptor = novo
  }
}
