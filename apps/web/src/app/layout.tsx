import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'GoldenBot — Plataforma CRM + Chatbot',
  description: 'Gestiona tus leads, automatiza tus respuestas y convierte más clientes con GoldenBot.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'Inter, system-ui, sans-serif' },
          }}
        />
      </body>
    </html>
  );
}
