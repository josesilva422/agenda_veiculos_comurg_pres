"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import ptBr from "@fullcalendar/core/locales/pt-br";
import type { EventSourceFuncArg } from "@fullcalendar/core";
import { ATIVOS, COR_OCUPADO, STATUS, statusInfo } from "@/lib/status";
import { btnCls, cardCls, inputCls } from "./ui";

type Opt = { id: string; label: string };

const MINHAS: Record<string, string> = {
  PENDENTE: "Minha solicitação pendente",
  ALTERACAO_PENDENTE: "Minha alteração pendente",
  APROVADO: "Minha reserva aprovada",
};

const HORA_MS = 3600_000;
const DIA_MS = 24 * HORA_MS;

type ItemDia = { id: string; titulo: string; horario: string; cor: string; status: string; url?: string };

const p2 = (n: number) => String(n).padStart(2, "0");
const hm = (d: Date) => `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
const dm = (d: Date) => `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}`;
const tituloDia = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** Calendário em hora de parede de Brasília (timeZone UTC + horários já deslocados pelo servidor). */
export default function CalendarView({
  role,
  vehicles,
  users = [],
}: {
  role: "ADMIN" | "USER";
  vehicles: Opt[];
  users?: Opt[];
}) {
  const router = useRouter();
  const path = usePathname();
  const aviso = useSearchParams();
  const okMsg = aviso.get("ok");
  const ref = useRef<FullCalendar>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");
  const filtros = useRef({ vehicleId, status, userId });
  const [erro, setErro] = useState("");
  const [celular, setCelular] = useState(false);
  const [dia, setDia] = useState<{ data: string; itens: ItemDia[] } | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const atualiza = () => setCelular(mq.matches);
    atualiza();
    mq.addEventListener("change", atualiza);
    return () => mq.removeEventListener("change", atualiza);
  }, []);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (dia && !d.open) d.showModal();
    if (!dia && d.open) d.close();
  }, [dia]);

  /** Pop-up com os agendamentos do dia (usa o que o calendário já carregou, respeitando os filtros). */
  function abrirDia(data: string) {
    const ini = new Date(`${data}T00:00:00Z`).getTime();
    const fim = ini + DIA_MS;
    const itens = (ref.current?.getApi().getEvents() ?? [])
      .filter((e) => e.start && e.end && e.start.getTime() < fim && e.end.getTime() > ini)
      .sort((a, b) => a.start!.getTime() - b.start!.getTime())
      .map((e): ItemDia => {
        const a = e.start!;
        const b = e.end!;
        const mesmoDia = a.getTime() >= ini && b.getTime() <= fim;
        return {
          id: e.id,
          titulo: e.title,
          horario: mesmoDia ? `${hm(a)} às ${hm(b)}` : `${dm(a)} ${hm(a)} → ${dm(b)} ${hm(b)}`,
          cor: e.backgroundColor,
          status: statusInfo[e.extendedProps.status as keyof typeof statusInfo]?.label ?? "",
          url: e.extendedProps.url as string | undefined,
        };
      });
    ref.current?.getApi().unselect();
    setDia({ data, itens });
  }

  function irPara(url: string) {
    setDia(null);
    router.push(url);
  }

  useEffect(() => {
    filtros.current = { vehicleId, status, userId };
    ref.current?.getApi().refetchEvents();
  }, [vehicleId, status, userId]);

  // depois de criar um agendamento pelo pop-up a página volta com ?ok=: recarrega os eventos
  useEffect(() => {
    if (okMsg) ref.current?.getApi().refetchEvents();
  }, [okMsg]);

  async function carregar(
    info: EventSourceFuncArg,
    ok: (e: never[]) => void,
    falha: (e: Error) => void,
  ) {
    const p = new URLSearchParams({ start: info.startStr, end: info.endStr });
    const f = filtros.current;
    if (f.vehicleId) p.set("vehicleId", f.vehicleId);
    if (f.status) p.set("status", f.status);
    if (f.userId) p.set("userId", f.userId);
    try {
      const r = await fetch(`/api/calendario?${p}`);
      if (!r.ok) throw new Error("Falha ao carregar o calendário.");
      setErro("");
      ok(await r.json());
    } catch (e) {
      setErro("Não foi possível carregar os agendamentos.");
      falha(e as Error);
    }
  }

  /** Abre o pop-up de novo agendamento (?novo=1) com o período escolhido. */
  function novo(startStr: string, endStr: string, allDay: boolean) {
    let ini: string;
    let fim: string;
    if (allDay) {
      const ultimo = new Date(new Date(`${endStr}T00:00:00Z`).getTime() - 24 * HORA_MS).toISOString().slice(0, 10);
      ini = `${startStr.slice(0, 10)}T08:00`;
      fim = `${ultimo}T18:00`;
    } else {
      ini = startStr.slice(0, 16);
      let f = new Date(`${endStr.slice(0, 16)}:00Z`);
      if (f.getTime() - new Date(`${ini}:00Z`).getTime() < HORA_MS) f = new Date(new Date(`${ini}:00Z`).getTime() + HORA_MS);
      fim = f.toISOString().slice(0, 16);
    }
    const q = new URLSearchParams({ novo: "1", inicio: ini, fim });
    if (vehicleId) q.set("vehicleId", vehicleId);
    ref.current?.getApi().unselect();
    router.push(`${path}?${q}`);
  }

  /** Novo agendamento no dia aberto (08:00 às 18:00 como sugestão). */
  function novoNoDia(data: string) {
    const q = new URLSearchParams({ novo: "1", inicio: `${data}T08:00`, fim: `${data}T18:00` });
    if (vehicleId) q.set("vehicleId", vehicleId);
    irPara(`${path}?${q}`);
  }

  const legenda = ATIVOS.map((s) => [statusInfo[s].cor, role === "ADMIN" ? statusInfo[s].label : MINHAS[s]]);
  if (role === "USER") legenda.push([COR_OCUPADO, "Ocupado (outros)"]);

  return (
    <div>
      <div className={`mb-3 p-3 sm:p-4 ${cardCls}`}>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Veículo
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={`${inputCls} text-sm font-normal normal-case tracking-normal text-slate-900 lg:w-56`}>
              <option value="">Todos</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </label>
          {role === "ADMIN" && (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Solicitante
                <select value={userId} onChange={(e) => setUserId(e.target.value)} className={`${inputCls} text-sm font-normal normal-case tracking-normal text-slate-900 lg:w-56`}>
                  <option value="">Todos</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} text-sm font-normal normal-case tracking-normal text-slate-900 lg:w-44`}>
                  <option value="">Ativos</option>
                  {STATUS.map((s) => (
                    <option key={s} value={s}>{statusInfo[s].label}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {(vehicleId || userId || status) && (
            <button
              type="button"
              onClick={() => {
                setVehicleId("");
                setUserId("");
                setStatus("");
              }}
              className="justify-self-start rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Limpar filtros
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-slate-600">
          {legenda.map(([cor, nome]) => (
            <span key={nome} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded" style={{ background: cor }} />
              {nome}
            </span>
          ))}
        </div>
      </div>
      {erro && <p role="alert" className="mb-2 text-sm text-red-600">{erro}</p>}

      <div className={`p-3 ${cardCls}`}>
        <FullCalendar
          ref={ref}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          locale={ptBr}
          timeZone="UTC"
          now={() => new Date(Date.now() - 3 * HORA_MS)}
          nowIndicator
          initialView="dayGridMonth"
          headerToolbar={
            celular
              ? { left: "prev,next", center: "title", right: "today" }
              : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" }
          }
          footerToolbar={celular ? { center: "dayGridMonth,timeGridDay,listWeek" } : false}
          titleFormat={celular ? { month: "short", year: "numeric" } : undefined}
          moreLinkClick={(a) => {
            abrirDia(a.date.toISOString().slice(0, 10));
            return undefined;
          }}
          buttonText={{ today: "Hoje", month: "Mês", week: "Semana", day: "Dia", list: "Lista" }}
          height="auto"
          events={carregar}
          slotMinTime="05:00:00"
          slotMaxTime="23:00:00"
          scrollTime="07:00:00"
          allDaySlot={false}
          dayMaxEvents={celular ? 3 : 4}
          moreLinkContent={(a) => `+${a.num}`}
          eventDisplay="block"
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          selectable
          selectAllow={(s) => s.start.getTime() >= Date.now() - 3 * HORA_MS - 24 * HORA_MS}
          select={(s) => (s.allDay ? abrirDia(s.startStr.slice(0, 10)) : novo(s.startStr, s.endStr, false))}
          eventClick={(i) => {
            const url = i.event.extendedProps.url as string | undefined;
            if (url) {
              i.jsEvent.preventDefault();
              // administrador decide dentro de um pop-up, sem sair do calendário
              router.push(role === "ADMIN" ? `${path}?decidir=${i.event.id || url.split("/").pop()}` : url);
            }
          }}
          eventDidMount={(i) => {
            i.el.title = i.event.title;
          }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Clique em um dia para ver os agendamentos dele. Na visão de semana ou dia, arraste em um horário livre para
        solicitar. Horários de Brasília.
      </p>

      <dialog
        ref={dlg}
        aria-labelledby="titulo-dia"
        onClose={() => setDia(null)}
        onClick={(e) => {
          if (e.target === dlg.current) dlg.current?.close();
        }}
        className="m-auto max-h-[92vh] w-[min(94vw,32rem)] overflow-y-auto rounded-md border bg-white p-0 shadow-xl backdrop:bg-slate-900/40"
      >
        {dia && (
          <>
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 id="titulo-dia" className="text-base font-semibold capitalize">{tituloDia(dia.data)}</h2>
              <button type="button" onClick={() => dlg.current?.close()} className="text-sm text-slate-600 hover:underline">
                Fechar
              </button>
            </div>
            <div className="p-5">
              {dia.itens.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum agendamento neste dia.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {dia.itens.map((i) => (
                    <li key={i.id} className="flex items-start gap-3 py-2.5">
                      <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded" style={{ background: i.cor }} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium tabular-nums">{i.horario}</div>
                        <div className="break-words text-slate-700">{i.titulo}</div>
                        {i.status && <div className="text-xs text-slate-500">{i.status}</div>}
                      </div>
                      {i.url && (
                        <button
                          type="button"
                          onClick={() => irPara(role === "ADMIN" ? `${path}?decidir=${i.id}` : i.url!)}
                          className="shrink-0 text-sm text-marca-forte hover:underline"
                        >
                          {role === "ADMIN" ? "Abrir" : "Editar"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={() => novoNoDia(dia.data)} className={`mt-4 ${btnCls}`}>
                Novo agendamento neste dia
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
