import { ImageResponse } from "next/og";
import { SIMBOLO_PNG, SIMBOLO_PROPORCAO } from "./icone-simbolo";

/** Ícone do app (instalação no celular e favicon): símbolo da Comurg sobre fundo branco. */
export function iconePwa(tam: number, mascaravel = false) {
  // ícones "maskable" precisam de margem de segurança: o sistema recorta as bordas
  const alturaSimbolo = Math.round(tam * (mascaravel ? 0.52 : 0.72));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: mascaravel ? 0 : Math.round(tam * 0.18),
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SIMBOLO_PNG} alt="" height={alturaSimbolo} width={Math.round(alturaSimbolo * SIMBOLO_PROPORCAO)} />
      </div>
    ),
    { width: tam, height: tam },
  );
}
