import { NextResponse, type NextRequest } from "next/server";
import { sessaoApi } from "@/lib/auth";
import { carregarRelatorio, lerFiltros } from "@/lib/reports";
import { buildPdf, buildXlsx } from "@/lib/report-export";

export const runtime = "nodejs";

const TIPOS = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;

export async function GET(req: NextRequest, ctx: { params: Promise<{ formato: string }> }) {
  const session = await sessaoApi();
  if (!session?.user) return new NextResponse("Não autenticado", { status: 401 });
  if (session.user.role !== "ADMIN") return new NextResponse("Acesso negado", { status: 403 });

  const { formato } = await ctx.params;
  if (formato !== "xlsx" && formato !== "pdf") return new NextResponse("Formato inválido", { status: 404 });

  const f = lerFiltros(Object.fromEntries(req.nextUrl.searchParams));
  const dados = await carregarRelatorio(f);
  const corpo = formato === "xlsx" ? await buildXlsx(dados) : await buildPdf(dados);

  return new NextResponse(Buffer.from(corpo), {
    headers: {
      "Content-Type": TIPOS[formato],
      "Content-Disposition": `attachment; filename="agendamentos_${f.de}_${f.ate}.${formato}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
