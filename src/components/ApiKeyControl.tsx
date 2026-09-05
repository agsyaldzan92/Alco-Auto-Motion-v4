import React, { useState, useEffect } from 'react';
import { Key, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  hasCustomApiKey,
  getMaskedApiKey,
  subscribeApiKeyChanges,
} from '../services/apiKeyService';

interface ApiKeyControlProps {
  onOpenModal: () => void;
}

export const ApiKeyControl: React.FC<ApiKeyControlProps> = ({ onOpenModal }) => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [maskedKey, setMaskedKey] = useState<string>('');

  useEffect(() => {
    const updateKeyStatus = () => {
      const isSet = hasCustomApiKey();
      setHasKey(isSet);
      setMaskedKey(isSet ? getMaskedApiKey() : '');
    };

    updateKeyStatus();
    const unsubscribe = subscribeApiKeyChanges(() => {
      updateKeyStatus();
    });

    return () => unsubscribe();
  }, []);

  if (hasKey) {
    return (
      <div className="flex items-center gap-2">
        <div
          id="status-apikey-connected"
          className="px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5"
          title={`API Key terhubung (${maskedKey})`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50 animate-pulse" />
          <span>API Key terhubung</span>
        </div>

        <button
          id="btn-apikey-change"
          type="button"
          onClick={onOpenModal}
          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          title="Klik untuk mengganti API Key Google AI Studio"
        >
          <RefreshCw className="w-3 h-3 text-slate-400" />
          <span>Ganti API Key</span>
        </button>
      </div>
    );
  }

  return (
    <button
      id="btn-apikey-control"
      type="button"
      onClick={onOpenModal}
      className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs animate-pulse"
      title="API Key belum terhubung. Klik untuk menambahkan API Key Google AI Studio gratis."
    >
      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
      <span className="font-semibold text-[11px]">API Key belum terhubung</span>
      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-200 text-[9px] font-bold uppercase border border-rose-400/30">
        HUBUNGKAN
      </span>
    </button>
  );
};
