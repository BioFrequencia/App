import { postJson } from './client';
import type { ApiResponse, ContatosDoAluno, DestinoMensagem, EnvioDeMensagem, EnvioPrevisto, ModelosMensagem } from '../types';

/**
 * Mensagem da coordenação aos responsáveis de um aluno - a mesma do site
 * (Notificações > Enviar mensagem). Ver na API: notificacao/modelos.php,
 * contatos.php, previa.php e enviar.php.
 */

/** Modelos prontos, variáveis do texto, tamanho máximo e se cada canal sai sozinho. */
export function carregarModelos(): Promise<ApiResponse<ModelosMensagem>> {
  return postJson<ModelosMensagem>('notificacao/modelos.php');
}

/** Os responsáveis do aluno e por onde dá para falar com cada um. */
export function carregarContatos(idAluno: number): Promise<ApiResponse<ContatosDoAluno>> {
  return postJson<ContatosDoAluno>('notificacao/contatos.php', { id_aluno: idAluno });
}

/** A mensagem montada para cada destino, sem enviar nada. */
export function preverMensagem(idAluno: number, mensagem: string, destinos: DestinoMensagem[]): Promise<ApiResponse<{ envios: EnvioPrevisto[] }>> {
  return postJson<{ envios: EnvioPrevisto[] }>('notificacao/previa.php', { id_aluno: idAluno, mensagem, destinos });
}

/** Envia (a mesma da prévia). A chave impede que o mesmo pedido mande duas vezes. */
export function enviarMensagem(idAluno: number, mensagem: string, destinos: DestinoMensagem[], chave: string): Promise<ApiResponse<EnvioDeMensagem>> {
  return postJson<EnvioDeMensagem>('notificacao/enviar.php', { id_aluno: idAluno, mensagem, destinos, chave });
}
