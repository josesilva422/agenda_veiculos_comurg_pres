import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { fmtDateTime } from "./datetime";
import { statusInfo } from "./status";
import { horas, summarize, type Agg } from "./reports-summary";
import type { RowCompleta } from "./reports";

type Dados = { rows: RowCompleta[]; truncado: boolean; filtrosTxt: string[] };

const h2 = (n: number) => Math.round(n * 100) / 100;
const OFFSET_MS = 3 * 3600_000;
/** Excel não tem fuso: grava a hora de parede de Brasília como se fosse UTC. */
const wall = (d: Date) => new Date(d.getTime() - OFFSET_MS);

export async function buildXlsx({ rows, truncado, filtrosTxt }: Dados): Promise<Uint8Array> {
  const s = summarize(rows);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Agendamento de Veículos";
  wb.created = new Date();

  const head = (ws: ExcelJS.Worksheet) => {
    const r = ws.getRow(1);
    r.font = { bold: true, color: { argb: "FFFFFFFF" } };
    r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  // Resumo
  const wr = wb.addWorksheet("Resumo");
  wr.columns = [{ width: 34 }, { width: 18 }];
  wr.addRow(["Relatório de agendamentos"]).font = { bold: true, size: 14 };
  filtrosTxt.forEach((t) => wr.addRow([t]));
  if (truncado) wr.addRow(["ATENÇÃO: resultado limitado às primeiras linhas; refine os filtros."]).font = { color: { argb: "FFB91C1C" } };
  wr.addRow([]);
  wr.addRow(["Total de agendamentos", s.total]);
  wr.addRow(["Horas aprovadas", h2(s.horasAprovadas)]);
  wr.addRow([]);
  wr.addRow(["Status", "Quantidade"]).font = { bold: true };
  (Object.keys(s.porStatus) as (keyof typeof s.porStatus)[]).forEach((k) => wr.addRow([statusInfo[k].label, s.porStatus[k]]));

  // Agendamentos
  const wa = wb.addWorksheet("Agendamentos");
  wa.columns = [
    { header: "Solicitante", key: "nome", width: 26 },
    { header: "Matrícula", key: "mat", width: 12 },
    { header: "Lotação", key: "setor", width: 18 },
    { header: "Veículo", key: "pref", width: 12 },
    { header: "Placa", key: "placa", width: 11 },
    { header: "Contrato", key: "contrato", width: 18 },
    { header: "Início", key: "ini", width: 17, style: { numFmt: "dd/mm/yyyy hh:mm" } },
    { header: "Fim", key: "fim", width: 17, style: { numFmt: "dd/mm/yyyy hh:mm" } },
    { header: "Duração (h)", key: "dur", width: 12 },
    { header: "Destino/motivo", key: "dest", width: 34 },
    { header: "Passageiros", key: "pass", width: 12 },
    { header: "Status", key: "st", width: 18 },
    { header: "Justificativa", key: "just", width: 30 },
    { header: "Decidido por", key: "dec", width: 20 },
    { header: "Motorista", key: "mot", width: 24 },
    { header: "Km inicial", key: "kmi", width: 11 },
    { header: "Km final", key: "kmf", width: 11 },
    { header: "Percurso (km)", key: "perc", width: 13 },
    { header: "Termo aceito em", key: "termo", width: 18, style: { numFmt: "dd/mm/yyyy hh:mm" } },
  ];
  head(wa);
  rows.forEach((r) =>
    wa.addRow({
      nome: r.user.nome, mat: r.user.matricula ?? "", setor: r.user.setor ?? "", pref: r.vehicle.prefixo,
      placa: r.vehicle.placa, contrato: r.vehicle.contrato ?? "", ini: wall(r.inicio), fim: wall(r.fim), dur: h2(horas(r)), dest: r.destino,
      pass: r.passageiros, st: statusInfo[r.status].label, just: r.justificativa ?? "", dec: r.decididoPor?.nome ?? "",
      mot: r.motorista ?? "", kmi: r.kmInicial ?? "", kmf: r.kmFinal ?? "",
      perc: r.kmInicial !== null && r.kmFinal !== null ? r.kmFinal - r.kmInicial : "", termo: r.termoAceitoEm ? wall(r.termoAceitoEm) : "Não registrado",
    }),
  );
  wa.autoFilter = { from: "A1", to: "S1" };

  const aggSheet = (nome: string, col1: string, col2: string, list: Agg[]) => {
    const w = wb.addWorksheet(nome);
    w.columns = [
      { header: col1, key: "n", width: 26 },
      { header: col2, key: "d", width: 18 },
      { header: "Total", key: "t", width: 10 },
      { header: "Aprovados", key: "a", width: 12 },
      { header: "Cancelados", key: "c", width: 12 },
      { header: "Rejeitados", key: "r", width: 12 },
      { header: "Horas aprovadas", key: "h", width: 16 },
    ];
    head(w);
    list.forEach((a) => w.addRow({ n: a.nome, d: a.detalhe, t: a.total, a: a.aprovadas, c: a.canceladas, r: a.rejeitadas, h: h2(a.horasAprovadas) }));
  };
  aggSheet("Por veículo", "Veículo", "Placa", s.porVeiculo);
  aggSheet("Por usuário", "Usuário", "Lotação", s.porUsuario);

  return new Uint8Array(await wb.xlsx.writeBuffer());
}

export function buildPdf({ rows, truncado, filtrosTxt }: Dados): Promise<Uint8Array> {
  const s = summarize(rows);
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const fim = new Promise<Uint8Array>((res) => doc.on("end", () => res(new Uint8Array(Buffer.concat(chunks)))));

  const L = 36;
  const W = doc.page.width - 72;
  const bottom = () => doc.page.height - 50;

  doc.font("Helvetica-Bold").fontSize(16).text("Relatório de agendamentos de veículos", L, 36);
  doc.font("Helvetica").fontSize(9).fillColor("#334155");
  doc.text(filtrosTxt.join("   |   "), L, doc.y + 2, { width: W });
  doc.text(`Gerado em ${fmtDateTime(new Date())}`);
  if (truncado) doc.fillColor("#b91c1c").text("Atenção: resultado limitado; refine os filtros.").fillColor("#334155");
  doc.moveDown(0.6);

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a");
  doc.text(
    `Total: ${s.total}   Horas aprovadas: ${h2(s.horasAprovadas)}   ` +
      (Object.keys(s.porStatus) as (keyof typeof s.porStatus)[]).map((k) => `${statusInfo[k].label}: ${s.porStatus[k]}`).join("   "),
    L, doc.y, { width: W },
  );
  doc.moveDown(0.8);

  type Col = { t: string; w: number };
  const tabela = (titulo: string, cols: Col[], linhas: string[][]) => {
    if (doc.y > bottom() - 60) doc.addPage();
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text(titulo, L, doc.y);
    doc.moveDown(0.3);
    const cab = () => {
      const y = doc.y;
      doc.rect(L, y, W, 16).fill("#1e3a8a");
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
      let x = L;
      cols.forEach((c) => {
        doc.text(c.t, x + 3, y + 4, { width: c.w - 6, lineBreak: false, ellipsis: true });
        x += c.w;
      });
      doc.y = y + 18;
    };
    cab();
    doc.font("Helvetica").fontSize(8);
    linhas.forEach((l, i) => {
      if (doc.y > bottom()) {
        doc.addPage();
        cab();
        doc.font("Helvetica").fontSize(8);
      }
      const y = doc.y;
      if (i % 2 === 0) doc.rect(L, y - 1, W, 14).fill("#f1f5f9");
      doc.fillColor("#0f172a");
      let x = L;
      l.forEach((v, k) => {
        doc.text(v, x + 3, y + 2, { width: cols[k].w - 6, lineBreak: false, ellipsis: true });
        x += cols[k].w;
      });
      doc.y = y + 14;
    });
    doc.moveDown(0.8);
  };

  const aggCols = (a: string, b: string): Col[] => [
    { t: a, w: 230 }, { t: b, w: 150 }, { t: "Total", w: 60 }, { t: "Aprovados", w: 70 },
    { t: "Cancelados", w: 70 }, { t: "Rejeitados", w: 70 }, { t: "Horas aprov.", w: 80 },
  ];
  const aggLinhas = (l: Agg[]) =>
    l.map((a) => [a.nome, a.detalhe, a.total, a.aprovadas, a.canceladas, a.rejeitadas, h2(a.horasAprovadas)].map(String));

  tabela("Utilização por veículo", aggCols("Veículo", "Placa"), aggLinhas(s.porVeiculo));
  tabela("Solicitações por usuário", aggCols("Usuário", "Lotação"), aggLinhas(s.porUsuario));
  tabela(
    "Agendamentos",
    [
      { t: "Solicitante", w: 110 }, { t: "Veículo", w: 52 }, { t: "Contrato", w: 64 }, { t: "Início", w: 84 }, { t: "Fim", w: 84 },
      { t: "Destino/motivo", w: 104 }, { t: "Pass.", w: 32 }, { t: "Status", w: 72 }, { t: "Decidido por", w: 80 }, { t: "Termo aceito", w: 78 },
    ],
    rows.map((r) => [
      r.user.nome, r.vehicle.prefixo, r.vehicle.contrato ?? "—", fmtDateTime(r.inicio), fmtDateTime(r.fim), r.destino,
      String(r.passageiros), statusInfo[r.status].label, r.decididoPor?.nome ?? "—",
      r.termoAceitoEm ? fmtDateTime(r.termoAceitoEm) : "—",
    ]),
  );

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.font("Helvetica").fontSize(8).fillColor("#64748b");
    doc.text(`Página ${i + 1} de ${range.count}`, L, doc.page.height - 30, { width: W, align: "right", lineBreak: false });
  }
  doc.end();
  return fim;
}
