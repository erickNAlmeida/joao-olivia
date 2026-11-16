
import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";



const pasta = path.join(process.cwd(), "data");
const arquivo = path.join(pasta, "presentes.json");

const dadosIniciais = {
  chaDeBebe: {
    nomes: ["João Carlos", "Olívia"],
    titulo: "João Carlos & Olívia estão chegando!",
    data: ""
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

async function inicializar() {
  await mkdir(pasta, { recursive: true });

  try {
    await readFile(arquivo, "utf8");
  } catch (erro) {
    if (erro.code !== "ENOENT") throw erro;

    await writeFile(
      arquivo,
      JSON.stringify(dadosIniciais, null, 2),
      "utf8"
    );
  }
}

async function carregar() {
  await inicializar();

  const conteudo = await readFile(arquivo, "utf8");
  return JSON.parse(conteudo);
}

export async function GET() {
  try {
    const dados = await carregar();

    return NextResponse.json(dados);
  } catch (erro) {
    console.error("Erro ao carregar presentes:", erro);

    return NextResponse.json(
      { erro: "Erro ao carregar presentes.", detalhe: erro.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { id, convidado, quantidade } = await request.json();

    if (!Number.isInteger(id) ||
        typeof convidado !== "string" ||
        !convidado.trim() ||
        !Number.isInteger(quantidade) ||
        quantidade < 1) {
      return NextResponse.json(
        { erro: "Dados inválidos." },
        { status: 400 }
      );
    }

    const dados = await carregar();

    const presente = dados.presentes.find(p => p.id === id);

    if (!presente) {
      return NextResponse.json(
        { erro: "Presente não encontrado." },
        { status: 404 }
      );
    }

    const reservado = presente.reservas.reduce(
      (total, r) => total + r.quantidade,
      0
    );

    if (reservado + quantidade > presente.quantidade) {
      return NextResponse.json(
        { erro: "Quantidade indisponível." },
        { status: 409 }
      );
    }

    presente.reservas.push({
      convidado: convidado.trim(),
      quantidade,
      data: new Date().toISOString()
    });

    await writeFile(
      arquivo,
      JSON.stringify(dados, null, 2),
      "utf8"
    );

    return NextResponse.json({
      sucesso: true,
      presente
    });

  } catch (erro) {
    console.error("Erro ao salvar presente:", erro);

    return NextResponse.json(
      { erro: "Erro ao salvar presente.", detalhe: erro.message },
      { status: 500 }
    );
  }
}
