/**
 * Gera prisma/postgres/schema.prisma a partir de prisma/schema.prisma (SQLite, usado em desenvolvimento).
 * O modelo de dados é o mesmo; só mudam o provedor e as conexões. Roda no `vercel-build`.
 *   npm run db:pg:sync
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const origem = path.join(process.cwd(), "prisma", "schema.prisma");
const destinoDir = path.join(process.cwd(), "prisma", "postgres");

let s = readFileSync(origem, "utf8");

const trocas: [RegExp, string][] = [
  [
    /generator client \{[^}]*\}/,
    `generator client {\n  provider      = "prisma-client-js"\n  binaryTargets = ["native", "rhel-openssl-3.0.x"]\n}`,
  ],
  [
    /datasource db \{[^}]*\}/,
    `datasource db {\n  provider  = "postgresql"\n  url       = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")\n}`,
  ],
];
for (const [re, novo] of trocas) {
  if (!re.test(s)) throw new Error(`Trecho não encontrado em schema.prisma: ${re}`);
  s = s.replace(re, novo);
}

mkdirSync(destinoDir, { recursive: true });
writeFileSync(
  path.join(destinoDir, "schema.prisma"),
  `// GERADO por scripts/pg-schema.ts a partir de ../schema.prisma. Não edite: altere o schema principal e rode "npm run db:pg:sync".\n\n${s}`,
);
console.log("prisma/postgres/schema.prisma atualizado.");
