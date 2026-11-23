const DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Lê e valida os parâmetros de pré-preenchimento vindos do calendário. */
export function prefill(sp: { inicio?: string; fim?: string; vehicleId?: string }) {
  return {
    inicio: sp.inicio && DT.test(sp.inicio) ? sp.inicio : undefined,
    fim: sp.fim && DT.test(sp.fim) ? sp.fim : undefined,
    vehicleId: sp.vehicleId && /^[\w-]{1,40}$/.test(sp.vehicleId) ? sp.vehicleId : undefined,
  };
}
