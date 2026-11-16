import "./globals.css";

export const metadata = {
  title: "Chá de Bebê | João Carlos & Olívia",
  description: "Escolha seu presente e participe desse momento especial."
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}