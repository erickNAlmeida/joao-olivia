"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [dados, setDados] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [mensagem, setMensagem] = useState("");

  async function carregar() {
    const resposta = await fetch("/api");
    if (resposta.ok) setDados(await resposta.json());
  }

  useEffect(() => {
    carregar();
  }, []);

  async function reservar(e) {
    e.preventDefault();
    setMensagem("");

    const resposta = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selecionado.id,
        convidado: nome,
        quantidade: Number(quantidade)
      })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      setMensagem(resultado.erro);
      return;
    }

    setMensagem("Presente reservado com sucesso! Obrigado pelo carinho ❤️");
    setSelecionado(null);
    setNome("");
    setQuantidade(1);
    await carregar();
  }

  if (!dados) return <main className="loading">Carregando nossa lista... ☁️</main>;

  return (
    <main>
      <header className="banner">
        <div className="flores flores1">☁️</div>
        <div className="flores flores2">☁️</div>
        <h1>João Carlos <i>&</i> Olívia</h1>
        <h2>estão chegando!</h2>
      </header>

      <section className="conteudo">
        <span className="etiqueta">ESCOLHIDOS COM AMOR</span>
        <h2>Nos diga qual presente você irá levar para nossos bebês!</h2>

        <div className="aviso">
          Clique em <strong>“Vou levar este presente”</strong>, confira as
          sugestões e registre seu nome e a quantidade que levará à festa.
        </div>

        {mensagem && <p className="mensagem">{mensagem}</p>}

        <div className="grade">
          {dados.presentes.map(p => {
            const reservado = p.reservas.reduce(
              (s, r) => s + r.quantidade, 0
            );
            const disponivel = p.quantidade - reservado;

            return (
              <article className="card" key={p.id}>
                <h3>{p.nome}</h3>
                <button
                  disabled={disponivel === 0}
                  onClick={() => {
                    setSelecionado(p);
                    setQuantidade(1);
                    setMensagem("");
                  }}
                >
                  {disponivel === 0 ? "Presente completo ❤️" : "Vou levar este presente"}
                </button>
                <div className="contador">
                  {p.nome === "Chave PIX" ? (
                    <strong>PIX: 98984773510</strong>
                  ) : (
                    <>
                      Já temos <strong>{reservado}</strong> de {p.quantidade}
                    </>
                  )}
                </div>
                <small>{disponivel} disponível(is)</small>
              </article>
            );
          })}
        </div>
      </section>

      {selecionado && (
        <div className="overlay" onClick={() => setSelecionado(null)}>
          <form className="modal" onSubmit={reservar}
            onClick={e => e.stopPropagation()}>
            <h2>{selecionado.nome}</h2>
            <p>Que alegria contar com você!</p>

            <label>Seu nome</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Digite seu nome"
              required
            />

            <label>Quantidade que irá levar</label>
            <input
              type="number"
              min="1"
              max={selecionado.quantidade - selecionado.reservas.reduce(
                (s, r) => s + r.quantidade, 0
              )}
              value={quantidade}
              onChange={e => setQuantidade(Number(e.target.value))}
              required
            />

            <button type="submit">Confirmar presente ❤️</button>
            <button type="button" className="cancelar"
              onClick={() => setSelecionado(null)}>
              Voltar
            </button>
          </form>
        </div>
      )}

      <footer>
        Feito com amor para João Carlos & Olívia 🌼
      </footer>
    </main>
  );
}