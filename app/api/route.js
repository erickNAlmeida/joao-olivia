
import { NextResponse } from "next/server";
import {
  get,
  put,
  BlobPreconditionFailedError
} from "@vercel/blob";
import { readFile } from "fs/promises";
import path from "path";



const ARQUIVO = "joao-olivia/presentes.json";
const ACCESS = "private";

const dadosIniciais = {
  chaDeBebe: {
    nomes: ["João Carlos", "Olívia"],
    titulo: "João Carlos & Olívia estão chegando!",
    data: "323"
  },
  presentes: [
    { id: 1, nome: "Fraldas RN", quantidade: 3, reservas: [] },
    { id: 2, nome: "Fraldas P", quantidade: 10, reservas: [] },
    { id: 3, nome: "Fraldas M", quantidade: 16, reservas: [] },
    { id: 4, nome: "Fraldas G - PANTS", quantidade: 15, reservas: [] },
    { id: 5, nome: "Fraldas XG - PANTS", quantidade: 10, reservas: [] },
    { id: 6, nome: "Fraldas XXG - PANTS", quantidade: 10, reservas: [] },
    { id: 7, nome: "Toalha de Banho", quantidade: 4, reservas: [] },
    { id: 8, nome: "Lenços Umedecidos", quantidade: 10, reservas: [] },
    { id: 9, nome: "Pomada para Assadura", quantidade: 4, reservas: [] },
    { id: 10, nome: "Sabonete Infantil", quantidade: 4, reservas: [] }
  ]
};

// Lê os dados diretamente do Vercel Blob.
async function carregarBlob() {
  const blob = await get(ARQUIVO, {
    access: ACCESS
  });

  if (!blob || blob.statusCode !== 200) {
    return null;
  }

  const dados = await new Response(blob.stream).json();

  return {
    dados,
    etag: blob.blob.etag
  };
}

// Inicializa o Blob na primeira execução.
// Aproveita o JSON existente no projeto, se disponível.
async function carregar() {
  const existente = await carregarBlob();

  if (existente) {
    return existente;
  }

  let dados = dadosIniciais;

  try {
    const caminho = path.join(
      process.cwd(),
      "data",
      "presentes.json"
    );

    const conteudo = await readFile(caminho, "utf8");
    dados = JSON.parse(conteudo);

  } catch (erro) {
    if (erro.code !== "ENOENT") {
      throw erro;
    }
  }

  try {
    const blob = await put(
      ARQUIVO,
      JSON.stringify(dados, null, 2),
      {
        access: ACCESS,
        contentType: "application/json"
      }
    );

    return {
      dados,
      etag: blob.etag
    };

  } catch (erro) {
    // Outra requisição pode ter inicializado o arquivo.
    const atualizado = await carregarBlob();

    if (atualizado) {
      return atualizado;
    }

    throw erro;
  }
}

// Salva com controle de versão para evitar sobrescritas.
async function salvar(dados, etag) {
  return await put(
    ARQUIVO,
    JSON.stringify(dados, null, 2),
    {
      access: "private",
      contentType: "application/json",
      allowOverwrite: true,
      ifMatch: etag
    }
  );
}

// GET - Consulta os presentes.
export async function GET() {
  try {
    const { dados } = await carregar();

    // Não expõe nomes dos convidados publicamente.
    const resposta = {
      ...dados,
      presentes: dados.presentes.map(p => ({
        ...p,
        reservas: (p.reservas || []).map(r => ({
          quantidade: r.quantidade
        }))
      }))
    };

    return NextResponse.json(resposta, {
      headers: {
        "Cache-Control": "no-store"
      }
    });

  } catch (erro) {
    console.error("Erro ao carregar presentes:", erro);

    return NextResponse.json(
      { erro: "Erro ao carregar presentes." },
      { status: 500 }
    );
  }
}

// POST - Reserva um presente.
export async function POST(request) {
  try {
    const body = await request.json();

    const id = Number(body.id);
    const convidado = String(body.convidado || "").trim();
    const quantidade = Number(body.quantidade);

    if (
      !Number.isSafeInteger(id) ||
      !convidado ||
      convidado.length > 120 ||
      !Number.isSafeInteger(quantidade) ||
      quantidade < 1
    ) {
      return NextResponse.json(
        { erro: "Dados inválidos." },
        { status: 400 }
      );
    }

    // Até 5 tentativas em caso de reservas simultâneas.
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const { dados, etag } = await carregar();

      const presente = dados.presentes.find(
        p => Number(p.id) === id
      );

      if (!presente) {
        return NextResponse.json(
          { erro: "Presente não encontrado." },
          { status: 404 }
        );
      }

      presente.reservas = presente.reservas || [];

      const reservado = presente.reservas.reduce(
        (total, r) => total + Number(r.quantidade || 0),
        0
      );

      const disponivel = presente.quantidade - reservado;

      if (quantidade > disponivel) {
        return NextResponse.json(
          {
            erro: `Quantidade indisponível. Restam ${disponivel} unidade(s).`
          },
          { status: 409 }
        );
      }

      presente.reservas.push({
        convidado,
        quantidade,
        data: new Date().toISOString()
      });

      try {
        await salvar(dados, etag);

        return NextResponse.json({
          sucesso: true,
          presente
        });

      } catch (erro) {
        if (
          erro instanceof BlobPreconditionFailedError ||
          erro.name === "BlobPreconditionFailedError"
          ) {
            continue;
          }

          throw erro;
      }
    }

    return NextResponse.json(
      { erro: "Muitas reservas simultâneas. Tente novamente." },
      { status: 409 }
    );

  } catch (erro) {
    console.error("Erro ao salvar presente:", erro);

    return NextResponse.json(
      { erro: "Erro ao salvar presente." },
      { status: 500 }
    );
  }
}
