import "./globals.css";

export const metadata = {
  title: "News Intelligence Platform",
  description: "AI-powered news intelligence dashboard with live ingestion and hosted Postgres storage."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
