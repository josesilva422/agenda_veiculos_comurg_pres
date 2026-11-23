import { iconePwa } from "@/lib/icone-pwa";

const TAMANHOS = new Set([192, 512]);

/** /pwa/icone/192, /pwa/icone/512 e as versões "maskable" (…/512-maskable) usadas no manifest. */
export async function GET(_req: Request, ctx: { params: Promise<{ tam: string }> }) {
  const { tam } = await ctx.params;
  const mascaravel = tam.endsWith("-maskable");
  const n = Number(tam.replace("-maskable", ""));
  if (!TAMANHOS.has(n)) return new Response("Não encontrado", { status: 404 });
  const img = iconePwa(n, mascaravel);
  img.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return img;
}
