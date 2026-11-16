"use client";

import { useEffect, useState } from "react";

export default function Admin() {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    fetch("/api")
      .then(r => r.json())
      .then(setDados);
  }, []);

  if (!dados) return <p>Carregando...</p>;

  return (
    <main className="conteudo">
      <h1>Administração - João Carlos & Olívia</h1>
      <h2>Lista de presentes e convidados</h2>

      {dados.presentes.map(p => {
        const total = p.reservas.reduce(
          (s, r) => s + r.quantidade, 0
        );

        return (
          <article className="card" key={p.id}>
            <h3>{p.nome}</h3>
            <p>Quantidade desejada: {p.quantidade}</p>
            <p>Reservados: {total}</p>
            <p>Disponíveis: {p.quantidade - total}</p>

            {p.reservas.map((r, i) => (
              <p key={i}>
                {r.convidado} — {r.quantidade} unidade(s)
              </p>
            ))}
          </article>
        );
      })}
    </main>
  );
}