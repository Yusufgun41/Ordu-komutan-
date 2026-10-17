import React, { useState } from 'react';
import { Swords, Shield, Sparkles, Smartphone, Eye } from 'lucide-react';
import type { Difficulty } from '../game/types.ts';

interface TitleScreenProps {
  onStart: (difficulty: Difficulty) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-gradient-to-t from-slate-950/95 via-slate-900/80 to-slate-950/90 text-white select-none overflow-y-auto">
      <div className="max-w-lg w-full bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Emblem */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-900/40 border-2 border-amber-300 mb-4 transform rotate-3 hover:rotate-0 transition-transform">
          <Swords className="w-9 h-9 sm:w-11 sm:h-11 text-slate-950" />
        </div>

        {/* Title Lockup */}
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-1">
          ORDU KOMUTANI <span className="text-amber-400">3D</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-medium mb-6">
          Taktiksel Ordu Yönetimi & 3D Kale Kuşatması
        </p>

        {/* Mobile & Touch Ready Highlight */}
        <div className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-3.5 mb-5 flex flex-col gap-2 text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Mobil & Masaüstü Dokunmatik Destekli</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Tek Parmak: Kamerayı Gezdir</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Çift Parmak: Yakınlaştır / Uzaklaştır</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Alt Menü: Birlik Çağır & Hücum Et</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
              <span>⭐ XP & Seviye: Düşman yenen güçlenir!</span>
            </div>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="w-full mb-6">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Zorluk Derecesi
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['normal', 'hard', 'epic'] as Difficulty[]).map(diff => {
              const labels: Record<Difficulty, { title: string; color: string }> = {
                normal: { title: 'Dengeli', color: 'border-emerald-500 text-emerald-300' },
                hard: { title: 'Zorlu', color: 'border-amber-500 text-amber-300' },
                epic: { title: 'Destansı 💀', color: 'border-rose-500 text-rose-300' }
              };
              const isSelected = selectedDifficulty === diff;

              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    isSelected
                      ? `bg-slate-800 ${labels[diff].color} ring-2 ring-amber-400/30 shadow-md`
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {labels[diff].title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Start CTA Button */}
        <button
          type="button"
          data-start="true"
          onClick={() => onStart(selectedDifficulty)}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 text-base sm:text-lg font-black rounded-2xl shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Swords className="w-5 h-5" />
          <span>SAVAŞI BAŞLAT</span>
        </button>

        <p className="text-[11px] text-slate-500 mt-4">
          Boşluk veya Enter tuşuna basarak da başlatabilirsiniz
        </p>
      </div>
    </div>
  );
};
