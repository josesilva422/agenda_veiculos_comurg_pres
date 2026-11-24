/** Faixa de quatro cores da identidade visual da Comurg (laranja, verde, verde-escuro e azul-índigo). */
export default function FaixaComurg({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex h-1.5 w-full ${className}`}>
      <span className="w-[27%] bg-comurg-laranja" />
      <span className="w-[45%] bg-comurg-verde" />
      <span className="w-[17%] bg-marca" />
      <span className="w-[11%] bg-comurg-indigo" />
    </div>
  );
}
