import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'GoldenBot — Plataforma CRM + Chatbot',
  description: 'Gestiona tus leads, automatiza tus respuestas y convierte más clientes con GoldenBot.',
  manifest: '/manifest.json',
  themeColor: '#f59e0b',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GoldenBot',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f59e0b" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
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
