'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function WebchatPage() {
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [clientSlug, setClientSlug] = useState('tu-negocio');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const widgetUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/widget.js`
    : 'https://tudominio.com/widget.js';

  useEffect(() => {
    api.get('/client/me').then(({ data }) => {
      if (data.data?.slug) setClientSlug(data.data.slug);
    }).catch(() => {});
  }, []);

  const embedCode = `<!-- GoldenBot Widget -->
<script
  src="${widgetUrl}"
  data-client="${clientSlug}"
  data-api="${apiUrl}"
  async>
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Código copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Widget de Webchat</h1>
        <p className="text-dark-500 mt-1">
          Agrega el chat de GoldenBot a tu página web en menos de 1 minuto.
        </p>
      </div>

      {/* Pasos */}
      <div className="card mb-6">
        <h2 className="font-semibold text-dark-900 mb-4 flex items-center gap-2">
          <span>📋</span> Cómo instalarlo
        </h2>
        <ol className="space-y-3 text-sm text-dark-600">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
            <span>Copia el código que aparece abajo.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            <span>Pégalo justo antes del <code className="bg-dark-100 px-1 rounded">&lt;/body&gt;</code> de tu página web.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            <span>¡Listo! El chat aparece automáticamente en la esquina inferior derecha.</span>
          </li>
        </ol>
      </div>

      {/* Código embed */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-dark-900 flex items-center gap-2">
            <span>🔧</span> Tu código de instalación
          </h2>
          <Button size="sm" onClick={handleCopy}>
            {copied ? '✓ Copiado' : 'Copiar código'}
          </Button>
        </div>
        <pre className="bg-dark-900 text-green-400 rounded-xl p-4 text-xs overflow-x-auto leading-relaxed">
          {embedCode}
        </pre>
      </div>

      {/* Preview del widget */}
      <div className="card mb-6">
        <h2 className="font-semibold text-dark-900 mb-3 flex items-center gap-2">
          <span>👁️</span> Vista previa
        </h2>
        <p className="text-sm text-dark-500 mb-4">
          Así se verá el chat en la página web de tu cliente:
        </p>
        <div className="bg-gray-100 rounded-xl h-48 flex items-end justify-end p-6 relative overflow-hidden">
          <div className="text-xs text-dark-400 absolute top-4 left-4">Página web del cliente...</div>
          {/* Simulación del botón del widget */}
          <div className="flex flex-col items-end gap-2">
            <div className="bg-white rounded-2xl shadow-lg px-4 py-3 text-sm text-dark-700 max-w-48">
              ¡Hola! ¿En qué puedo ayudarte? 😊
            </div>
            <div className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center text-2xl shadow-lg">
              💬
            </div>
          </div>
        </div>
      </div>

      {/* Prueba rápida */}
      <div className="card bg-primary-50 border-primary-200">
        <h3 className="font-semibold text-primary-900 mb-2 flex items-center gap-2">
          <span>🧪</span> Prueba el chat ahora mismo
        </h3>
        <p className="text-sm text-primary-800 mb-3">
          Puedes probar el widget directamente en esta página sin necesidad de instalar nada:
        </p>
        <button
          onClick={() => {
            // Cargar el widget dinámicamente para prueba
            const existing = document.getElementById('gb-widget');
            if (existing) {
              existing.remove();
              const oldScript = document.getElementById('gb-test-script');
              if (oldScript) oldScript.remove();
            }
            const s = document.createElement('script');
            s.id = 'gb-test-script';
            s.src = '/widget.js';
            s.setAttribute('data-client', clientSlug);
            s.setAttribute('data-api', apiUrl);
            document.body.appendChild(s);
            toast.success('Widget cargado — busca el botón 💬 en la esquina inferior derecha');
          }}
          className="text-sm font-medium text-primary-700 underline hover:text-primary-900"
        >
          Cargar widget de prueba en esta página →
        </button>
      </div>
    </div>
  );
}
