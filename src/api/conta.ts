import { postJson } from './client';
import type { AcessoAlunoDados, ApiResponse, DispositivoVinculado } from '../types';

/**
 * POST {baseUrl}/aluno/entrar.php
 *
 * Login do aluno. É ele que conecta o celular: a resposta traz o segredo
 * do aparelho (device_secret), com o qual cada check-in é assinado depois
 * da biometria. A senha não fica guardada no celular.
 */
export function entrar(
  baseUrl: string,
  email: string,
  senha: string,
  deviceUuid: string
): Promise<ApiResponse<AcessoAlunoDados>> {
  return postJson<AcessoAlunoDados>(baseUrl, 'aluno/entrar.php', {
    email: email.trim(),
    senha,
    device_uuid: deviceUuid,
  });
}

/**
 * POST {baseUrl}/aluno/criarConta.php
 *
 * A conta só é criada para um aluno que a escola já cadastrou: o nome e a
 * data de nascimento precisam bater com o cadastro. Em caso de sucesso a
 * resposta é a mesma do login, e o aluno vai direto para o check-in.
 */
export function criarConta(
  baseUrl: string,
  dados: { nome: string; dataNascimentoIso: string; email: string; senha: string },
  deviceUuid: string
): Promise<ApiResponse<AcessoAlunoDados>> {
  return postJson<AcessoAlunoDados>(baseUrl, 'aluno/criarConta.php', {
    nome: dados.nome.trim(),
    data_nascimento: dados.dataNascimentoIso,
    email: dados.email.trim(),
    senha: dados.senha,
    device_uuid: deviceUuid,
  });
}

/** O que fica salvo no SecureStore depois do login ou do cadastro. */
export function dispositivoDaResposta(
  baseUrl: string,
  deviceUuid: string,
  dados: AcessoAlunoDados
): DispositivoVinculado {
  return {
    baseUrl,
    deviceUuid,
    deviceSecret: dados.device_secret,
    idAluno: dados.id_aluno,
    nomeAluno: dados.nome_aluno,
    email: dados.email,
  };
}
