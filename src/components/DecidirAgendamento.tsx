import ModalDecisao from "./ModalDecisao";
import PainelDecisao from "./PainelDecisao";

/** Coloque na página: se a URL tiver ?decidir=<id>, mostra o pop-up de decisão daquela solicitação. */
export default function DecidirAgendamento({ id, retorno }: { id?: string; retorno: string }) {
  if (!id) return null;
  return (
    <ModalDecisao key={id}>
      <PainelDecisao id={id} retorno={retorno} />
    </ModalDecisao>
  );
}
