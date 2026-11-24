/**
 * Banco PostgreSQL local para os testes E2E (sem Docker): PGlite (PostgreSQL de verdade, compilado para WebAssembly)
 * exposto numa porta TCP, como se fosse o Supabase. O banco nasce com o mesmo arquivo SQL que se cola no SQL Editor
 * do Supabase (prisma/postgres/supabase-sql-editor.sql), então o teste cobre também esse caminho de criação.
 *   node e2e/pglite-servidor.mjs   (usado pelo playwright.config.ts quando E2E_BANCO=postgres)
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const PORTA = Number(process.env.PGLITE_PORTA ?? 5433);

const db = await PGlite.create({ extensions: { btree_gist } });
await db.exec(readFileSync("prisma/postgres/supabase-sql-editor.sql", "utf8"));

const servidor = new PGLiteSocketServer({ db, port: PORTA, host: "127.0.0.1", maxConnections: 8 });
await servidor.start();
console.log(`PGlite (PostgreSQL) pronto em 127.0.0.1:${PORTA}`);

const encerrar = async () => {
  await servidor.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
