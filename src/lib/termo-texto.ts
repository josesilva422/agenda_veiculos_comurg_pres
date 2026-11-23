/**
 * Termo de Responsabilidade pelo uso e guarda de veículo, exibido no formulário de agendamento.
 * Baseado no modelo impresso da Comurg, em versão padrão: sem campos em branco, pois o solicitante
 * já está identificado no sistema e o veículo é o escolhido no agendamento. O aceite fica gravado no
 * agendamento (campo `termoAceitoEm`).
 * Para alterar o texto, edite os parágrafos abaixo (um item por parágrafo).
 */
export const TERMO_TITULO = "Termo de Responsabilidade pelo uso e guarda de veículo";

export const TERMO_PARAGRAFOS: string[] = [
  "Eu, empregado(a) da Companhia de Urbanização de Goiânia – COMURG, identificado(a) neste sistema pelo meu cadastro (nome, matrícula, telefone, cargo e lotação), declaro que recebo sob minha responsabilidade o veículo selecionado neste agendamento, pertencente ou contratado pela Companhia de Urbanização de Goiânia, que ficará lotado na unidade (Gerência/Diretoria) à qual estou vinculado(a).",
  "Declaro estar ciente de que o referido veículo será conduzido exclusivamente por empregados públicos da Companhia, devidamente autorizados, competindo a esta Gerência/Diretoria manter o controle, a guarda e o uso adequado do bem.",
  "Comprometo-me, ainda, a identificar e manter registro do motorista responsável pela condução do veículo, por meio de diário de bordo, controle interno, escala de serviço ou outro meio formal que possibilite a identificação, sempre que o veículo estiver em atividade.",
  "Assumo inteira responsabilidade por quaisquer danos, irregularidades, extravios, mau uso ou ocorrências que venham a acontecer com o veículo enquanto estiver sob a responsabilidade desta unidade, obrigando-me a prestar as informações necessárias e indicar o motorista responsável em caso de eventualidade.",
  "Este Termo é firmado para fins de controle administrativo e responsabilização, produzindo seus efeitos a partir da data e hora do aceite eletrônico, registrado neste sistema junto ao agendamento. O prefixo e a placa do veículo são os informados no agendamento.",
];
