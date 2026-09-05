import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Sparkles, X, ShieldCheck, ArrowRight, Zap } from 'lucide-react';
import {
  hasCustomApiKey,
  subscribeApiKeyChanges,
  getMaskedApiKey,
} from '../services/apiKeyService';

interface ApiKeyOnboardingCardProps {
  onOpenModal: () => void;
}

const DISMISS_KEY = 'alco_hide_apikey_onboarding';

export const ApiKeyOnboardingCard: React.FC<ApiKeyOnboardingCardProps> = ({ onOpenModal }) => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [maskedKey, setMaskedKey] = useState<string>('');

  useEffect(() => {
    const checkState = () => {
      const customKeyPresent = hasCustomApiKey();
      setHasKey(customKeyPresent);
      setMaskedKey(customKeyPresent ? getMaskedApiKey() : '');
      const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
      setIsDismissed(dismissed);
    };

    checkState();
    const unsubscribe = subscribeApiKeyChanges(() => {
      checkState();
    });

    return () => unsubscribe();
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  };

  // If user has key or explicitly dismissed, don't show the big onboarding card
  if (hasKey || isDismissed) {
    if (hasKey) {
      return (
        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white flex items-center gap-1.5">
                API Key terhubung: <span className="font-mono text-emerald-400 font-semibold">{maskedKey}</span>
              </p>
              <p className="text-[11px] text-slate-300">
                Key Anda disimpan hanya di browser Anda dan dikirim ke backend hanya saat proses AI berjalan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenModal}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0 transition-colors cursor-pointer"
          >
            Ganti API Key
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      id="gemini-apikey-onboarding-card"
      className="relative overflow-hidden bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-500/40 rounded-2xl p-5 shadow-xl text-xs space-y-4"
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        title="Tutup pemberitahuan"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            BYO GEMINI API KEY
          </span>
          <h3 className="text-sm sm:text-base font-bold text-white">
            Hubungkan Google AI Studio API Key Gratis
          </h3>
        </div>

        <p className="text-slate-300 leading-relaxed text-xs max-w-3xl">
          Alco Auto Motion memakai API key milik Anda sendiri agar kuota AI tetap aman dan tidak berbagi dengan pengguna lain. API key Google AI Studio bisa dibuat gratis dalam beberapa menit.
        </p>

        {/* Steps */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <p className="font-bold text-indigo-300 text-xs flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Langkah singkat:
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-slate-300">
            <li className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="font-bold text-amber-400">1.</span> Buka Google AI Studio.
            </li>
            <li className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="font-bold text-amber-400">2.</span> Login dengan akun Google.
            </li>
            <li className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="font-bold text-amber-400">3.</span> Masuk ke menu API Key.
            </li>
            <li className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="font-bold text-amber-400">4.</span> Klik Create API Key.
            </li>
            <li className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="font-bold text-amber-400">5.</span> Copy API key/token yang diberikan Google AI Studio, lalu paste di sini.
            </li>
            <li className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="font-bold text-amber-400">6.</span> Paste di Alco Auto Motion.
            </li>
          </ol>
        </div>

        {/* Actions & Helper Text */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-amber-400/30 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Buka Google AI Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={onOpenModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Saya Sudah Punya API Key</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            Key Anda disimpan hanya di browser Anda dan dikirim ke backend hanya saat proses AI berjalan.
          </p>
        </div>
      </div>
    </div>
  );
};
