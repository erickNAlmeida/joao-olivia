
import { NextResponse } from "next/server";
import { get, put } from "@vercel/blob";
import { readFile } from "fs/promises";
import path from "path";


const ARQUIVO = "joao-olivia/presentes.json";

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

// Consulta o arquivo no Blob sem utilizar cache.
async function carregar() {
  const blob = await get(ARQUIVO, {
    access: "private",
    useCache: false
  });

  if (blob && blob.statusCode === 200) {
    return await new Response(blob.stream).json();
  }

  // Importa os dados locais somente na primeira execução.
  try {
    const arquivoLocal = path.join(
      process.cwd(),
      "data",
      "presentes.json"
    );

    const conteudo = await readFile(arquivoLocal, "utf8");

    return JSON.parse(conteudo);
  } catch (erro) {
    if (erro.code !== "ENOENT") throw erro;
    return dadosIniciais;
  }
}

// Grava sempre no mesmo arquivo.
async function salvar(dados) {
  return await put(
    ARQUIVO,
    JSON.stringify(dados, null, 2),
    {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true
    }
  );
}

// GET
export async function GET() {
  try {
    const dados = await carregar();

    return NextResponse.json(dados, {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    });

  } catch (erro) {
    console.error("Erro ao carregar:", erro);

    return NextResponse.json(
      { erro: "Erro ao carregar presentes." },
      { status: 500 }
    );
  }
}

// POST
export async function POST(request) {
  try {
    const { id, convidado, quantidade } = await request.json();

    if (
      !Number.isSafeInteger(id) ||
      typeof convidado !== "string" ||
      !convidado.trim() ||
      !Number.isSafeInteger(quantidade) ||
      quantidade < 1
    ) {
      return NextResponse.json(
        { erro: "Dados inválidos." },
        { status: 400 }
      );
    }

    const dados = await carregar();

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
      (total, r) => total + Number(r.quantidade),
      0
    );

    const disponivel = presente.quantidade - reservado;

    if (quantidade > disponivel) {
      return NextResponse.json(
        {
          erro: `Quantidade indisponível. Restam ${disponivel}.`
        },
        { status: 409 }
      );
    }

    presente.reservas.push({
      convidado: convidado.trim(),
      quantidade,
      data: new Date().toISOString()
    });

    await salvar(dados);

    return NextResponse.json({
      sucesso: true,
      presente
    });

  } catch (erro) {
    console.error("ERRO REAL AO SALVAR:", erro);

    return NextResponse.json(
      {
        erro: "Erro ao salvar presente.",
        detalhe: erro.message
      },
      { status: 500 }
    );
  }
}
