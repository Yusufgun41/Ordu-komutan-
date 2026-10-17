import React from 'react';
import { Trophy, Skull, RotateCcw, Clock, Swords, Users, Coins, Star } from 'lucide-react';
import type { GameResult, GameStats } from '../game/types.ts';

interface GameOverModalProps {
  result: GameResult;
  stats: GameStats;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  result,
  stats,
  onRestart
}) => {
  if (!result) return null;

  const isVictory = result === 'victory';

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m} dk ${s} sn`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none">
      <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center text-white animate-in fade-in duration-300">
        {/* Outcome Icon & Title */}
        <div
          className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border mb-3 ${
            isVictory
              ? 'bg-gradient-to-br from-amber-500 to-yellow-600 border-amber-300 shadow-amber-500/30'
              : 'bg-gradient-to-br from-rose-600 to-red-800 border-rose-400 shadow-rose-900/40'
          }`}
        >
          {isVictory ? (
            <Trophy className="w-10 h-10 text-slate-950" />
          ) : (
            <Skull className="w-10 h-10 text-white" />
          )}
        </div>

        <h2
          className={`text-2xl sm:text-3xl font-black mb-1 ${
            isVictory ? 'text-amber-400' : 'text-rose-400'
          }`}
        >
          {isVictory ? 'ZAFER KAZANDINIZ!' : 'KALENİZ YIKILDI!'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-4">
          {isVictory
            ? 'Düşman kalesini yerle bir ettiniz ve toprakları fethettiniz!'
            : 'Düşman ordusu kalenizi işgal etti. Taktiklerinizi gözden geçirin!'}
        </p>

        {/* Stars */}
        {isVictory && (
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map(starNum => (
              <Star
                key={starNum}
                className={`w-8 h-8 ${
                  starNum <= stats.starsEarned
                    ? 'text-amber-400 fill-amber-400 drop-shadow'
                    : 'text-slate-700'
                }`}
              />
            ))}
          </div>
        )}

        {/* Battle Stats Grid */}
        <div className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-3 text-left">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Savaş Süresi</div>
              <div className="font-bold text-sm text-slate-100 tabular-nums">
                {formatTime(stats.battleDurationSeconds)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Swords className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">İmha Edilen Düşman</div>
              <div className="font-bold text-sm text-slate-100 tabular-nums">
                {stats.enemyUnitsKilled} Birlik
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Kayıplarımız</div>
              <div className="font-bold text-sm text-slate-100 tabular-nums">
                {stats.playerUnitsLost} Birlik
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Kazanılan Altın</div>
              <div className="font-bold text-sm text-slate-100 tabular-nums">
                {Math.round(stats.totalGoldEarned)} 💰
              </div>
            </div>
          </div>
        </div>

        {/* Hero MVP Banner if available */}
        {stats.topHeroUnit && (
          <div className="w-full bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3 mb-6 flex items-center justify-between text-left">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🎖️</span>
              <div>
                <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wide">
                  Savaşın Kahramanı
                </div>
                <div className="text-sm font-black text-amber-200">
                  {stats.topHeroUnit.name}{' '}
                  <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 rounded text-amber-300 ml-1">
                    Sv. {stats.topHeroUnit.level}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Öldürme</div>
              <div className="text-sm font-black text-white tabular-nums">
                {stats.topHeroUnit.kills} Düşman
              </div>
            </div>
          </div>
        )}

        {/* Restart Button */}
        <button
          type="button"
          data-start="true"
          onClick={onRestart}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>TEKRAR SAVAŞ</span>
        </button>
      </div>
    </div>
  );
};
