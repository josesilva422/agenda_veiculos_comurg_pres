import { ImageResponse } from "next/og";

/** Ícone do app (instalação no celular e favicon): fundo na cor da marca com as iniciais. */
export function iconePwa(tam: number, mascaravel = false) {
  // ícones "maskable" precisam de margem de segurança: o sistema recorta as bordas
  const fonte = Math.round(tam * (mascaravel ? 0.34 : 0.42));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e4c5a",
          color: "#ffffff",
          fontSize: fonte,
          fontWeight: 700,
          letterSpacing: -2,
          borderRadius: mascaravel ? 0 : Math.round(tam * 0.18),
        }}
      >
        AV
      </div>
    ),
    { width: tam, height: tam },
  );
}
