package expo.modules.leitordigital

/**
 * Lugar onde o driver do leitor escolhido pela escola é ligado ao app.
 *
 * Hoje nenhum driver vem instalado: a escola ainda não comprou o leitor, e
 * cada fabricante tem o seu SDK (com licença própria). Para ligar um:
 *  1. coloque o .aar do SDK em modules/leitor-digital/android/libs/ e
 *     declare em android/build.gradle (dependencies);
 *  2. crie uma classe que implemente DriverLeitorDigital usando o SDK
 *     (capturar = ler o dedo e gerar o template; comparar = o "match" do SDK);
 *  3. registre aqui: Drivers.registrar(MeuDriver());
 *  4. confira se o vendorId do leitor está em modules/leitor-digital/leitores.json.
 * O passo a passo completo está no README.md desta pasta.
 */
object DriversInstalados {
  @Volatile
  private var carregados = false

  fun carregar() {
    if (carregados) return
    carregados = true
    // Drivers.registrar(SecugenDriver())
  }
}
