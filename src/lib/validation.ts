import { z } from "zod";
import { VEICULO_STATUS } from "./status";

const texto = (max = 100) => z.string().trim().max(max);
const opcional = (max = 100) =>
  texto(max).transform((v) => (v === "" ? null : v)).nullable();

export const vehicleSchema = z.object({
  prefixo: texto(20).min(1, "Informe o prefixo."),
  placa: texto(8)
    .transform((v) => v.toUpperCase().replace(/[\s-]/g, ""))
    .refine((v) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(v), "Placa inválida (ex.: ABC1D23)."),
  tipo: texto(50).min(1, "Informe o tipo."),
  lotacao: z.coerce.number().int("Lotação inválida.").min(1, "Lotação mínima é 1.").max(60),
  contrato: opcional(100),
  status: z.enum(VEICULO_STATUS),
  observacao: opcional(300),
});

const userBase = {
  nome: texto(100).min(2, "Informe o nome."),
  email: texto(120)
    .toLowerCase()
    .pipe(z.string().email("E-mail inválido.")),
  matricula: texto(30).min(1, "Informe a matrícula."),
  telefone: texto(30).min(1, "Informe o telefone."),
  cargo: texto(80).min(1, "Informe o cargo."),
  setor: texto(60).min(1, "Informe a lotação."),
  contato: texto(120).min(1, "Informe o contato."),
  cnh: opcional(30),
  cnhValidade: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : new Date(v + "T12:00:00")))
    .nullable(),
  role: z.enum(["ADMIN", "USER"]),
};

// `senha` é opcional: no cadastro vazio = senha padrão; na edição, preenchida = redefinição (a regra da senha é conferida na ação)
export const userSchema = z.object({ ...userBase, senha: z.string().max(100).optional() });
