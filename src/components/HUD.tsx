import React, { useState } from 'react';
import {
  Shield,
  Swords,
  Coins,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Wrench,
  Users
} from 'lucide-react';
import type {
  UnitType,
  ArmyCommand,
  BattlefieldSnapshot,
  UpgradeLevels
} from '../game/types.ts';
import { UNIT_CONFIGS, UPGRADE_CONFIGS, getUpgradeCost } from '../game/rules.ts';

interface HUDProps {
  snapshot: BattlefieldSnapshot;
  upgrades: UpgradeLevels;
  isPaused: boolean;
  isMuted: boolean;
  onSpawnUnit: (type: UnitType) => void;
  onSetCommand: (cmd: ArmyCommand) => void;
  onBuyUpgrade: (type: keyof UpgradeLevels) => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onRestart: () => void;
  onJumpCamera: (preset: 'playerBase' | 'midfield' | 'enemyBase') => void;
}

export const HUD: React.FC<HUDProps> = ({
  snapshot,
  upgrades,
  isPaused,
  isMuted,
  onSpawnUnit,
  onSetCommand,
  onBuyUpgrade,
  onTogglePause,
  onToggleMute,
  onRestart,
  onJumpCamera
}) => {
  const [showUpgradesModal, setShowUpgradesModal] = useState(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  const playerHpPct = Math.max(0, Math.min(100, (snapshot.playerBaseHp / snapshot.maxBaseHp) * 100));
  const enemyHpPct = Math.max(0, Math.min(100, (snapshot.enemyBaseHp / snapshot.maxBaseHp) * 100));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const unitList: UnitType[] = ['infantry', 'archer', 'knight', 'mage', 'catapult'];

  return (
    <div className="fixed inset-0 pointer-events-none select-none flex flex-col justify-between p-2 sm:p-4 z-20 overflow-hidden font-sans">
      {/* Top Header Status Bar */}
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-1.5 sm:gap-2 pointer-events-auto">
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-2 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row items-center justify-between text-white text-xs sm:text-sm gap-2">
          {/* Top Row on Mobile: Gold, Timer & Controls */}
          <div className="w-full sm:w-auto flex items-center justify-between gap-2">
            {/* Gold Indicator */}
            <div className="flex items-center gap-2 bg-amber-950/50 border border-amber-600/40 rounded-xl px-2.5 py-1 sm:py-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <div className="flex items-center sm:flex-col leading-tight gap-1.5 sm:gap-0">
                <span className="font-black text-amber-300 text-sm sm:text-base tabular-nums">
                  {snapshot.gold}
                </span>
                <span className="text-[10px] text-amber-400/80 font-medium">
                  +{snapshot.goldPerSecond}/sn
                </span>
              </div>
            </div>

            {/* Timer, Army & Veteran Count (Center on mobile) */}
            <div className="flex items-center sm:hidden gap-2 px-2 py-0.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-1 font-bold text-slate-200 text-xs tabular-nums">
                <span className="text-slate-400 font-normal">⏱️</span> {formatTime(snapshot.timeRemainingOrElapsed)}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                <Users className="w-3 h-3" /> {snapshot.playerCount}/25
              </div>
              {snapshot.veteranCount > 0 && (
                <div className="flex items-center gap-0.5 text-[10px] text-amber-300 font-black bg-amber-950/70 border border-amber-500/50 px-1.5 py-0.2 rounded-md">
                  ★ {snapshot.veteranCount}
                </div>
              )}
            </div>

            {/* Controls: Mute, Pause */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleMute}
                className="p-1.5 sm:p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 active:scale-95 transition-transform"
                title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
                aria-label="Ses Kontrolü"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
              <button
                onClick={onTogglePause}
                className="p-1.5 sm:p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 active:scale-95 transition-transform"
                title={isPaused ? 'Devam Et' : 'Duraklat'}
                aria-label="Oyunu Duraklat"
              >
                {isPaused ? <Play className="w-4 h-4 text-amber-400" /> : <Pause className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Castle Health Status */}
          <div className="w-full sm:flex-1 sm:mx-4 flex items-center gap-2 sm:gap-4 justify-between sm:justify-center">
            {/* Player Castle HP */}
            <div className="flex-1 flex flex-col items-start gap-0.5">
              <div className="flex justify-between w-full text-[11px] font-bold text-blue-300">
                <span>🏰 Üssümüz</span>
                <span className="tabular-nums font-mono">{snapshot.playerBaseHp}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-blue-900/50">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-200"
                  style={{ width: `${playerHpPct}%` }}
                />
              </div>
            </div>

            {/* Desktop Center Timer */}
            <div className="hidden sm:flex flex-col items-center px-3 border-x border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Süre
              </span>
              <span className="font-bold text-slate-200 text-xs sm:text-sm tabular-nums">
                {formatTime(snapshot.timeRemainingOrElapsed)}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-medium">
                  <Users className="w-2.5 h-2.5" /> {snapshot.playerCount}/25
                </span>
                {snapshot.veteranCount > 0 && (
                  <span className="text-[10px] text-amber-300 font-bold bg-amber-950/70 border border-amber-500/40 px-1 rounded flex items-center gap-0.5">
                    ★ {snapshot.veteranCount} Kıdemli
                  </span>
                )}
              </div>
            </div>

            {/* Enemy Castle HP */}
            <div className="flex-1 flex flex-col items-end gap-0.5">
              <div className="flex justify-between w-full text-[11px] font-bold text-rose-300">
                <span className="tabular-nums font-mono">{snapshot.enemyBaseHp}</span>
                <span>Düşman 👹</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-rose-900/50">
                <div
                  className="h-full bg-gradient-to-l from-rose-600 to-red-400 transition-all duration-200"
                  style={{ width: `${enemyHpPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Camera Navigation Pills */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          <button
            onClick={() => onJumpCamera('playerBase')}
            className="px-2.5 py-1 bg-slate-900/85 hover:bg-slate-800 border border-blue-500/30 text-blue-300 hover:text-white text-[11px] font-medium rounded-lg shadow-md active:scale-95 transition-all"
          >
            🏰 Üssüm
          </button>
          <button
            onClick={() => onJumpCamera('midfield')}
            className="px-2.5 py-1 bg-slate-900/85 hover:bg-slate-800 border border-amber-500/30 text-amber-300 hover:text-white text-[11px] font-medium rounded-lg shadow-md active:scale-95 transition-all"
          >
            ⚔️ Savaş Köprüsü
          </button>
          <button
            onClick={() => onJumpCamera('enemyBase')}
            className="px-2.5 py-1 bg-slate-900/85 hover:bg-slate-800 border border-rose-500/30 text-rose-300 hover:text-white text-[11px] font-medium rounded-lg shadow-md active:scale-95 transition-all"
          >
            👹 Düşman Kalesi
          </button>
        </div>
      </div>

      {/* Upgrades Modal Popup (Drawer) */}
      {showUpgradesModal && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-md w-full shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold">Ordu & Kale Geliştirmeleri</h3>
              </div>
              <button
                onClick={() => setShowUpgradesModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 my-4">
              {(Object.keys(UPGRADE_CONFIGS) as Array<keyof UpgradeLevels>).map(key => {
                const conf = UPGRADE_CONFIGS[key];
                const curLvl = upgrades[key];
                const cost = getUpgradeCost(key, curLvl);
                const isMax = cost === -1;
                const canAfford = !isMax && snapshot.gold >= cost;

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 bg-slate-800/80 border border-slate-700 rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{conf.icon}</span>
                      <div>
                        <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                          {conf.name}
                          <span className="text-[11px] px-1.5 py-0.5 bg-slate-700 rounded text-amber-300">
                            Sv. {curLvl}/{conf.maxLevel}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">{conf.description}</div>
                      </div>
                    </div>

                    <button
                      disabled={!canAfford}
                      onClick={() => onBuyUpgrade(key)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95 ${
                        isMax
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg hover:brightness-110'
                          : 'bg-slate-700/60 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? 'Maks' : `💰 ${cost}`}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowUpgradesModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Bottom Tactical Management Dock (Zero Occlusion, Thumbs-friendly) */}
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-1.5 pointer-events-auto pb-1">
        {/* Dock Collapse Toggle Button */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="bg-slate-900/90 text-slate-300 hover:text-white px-3 py-0.5 rounded-full border border-slate-700/80 text-[11px] font-medium flex items-center gap-1 shadow-md active:scale-95 transition-all"
        >
          {isDockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> Komuta Panelini Aç
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> Gizle
            </>
          )}
        </button>

        {!isDockCollapsed && (
          <div className="w-full bg-slate-900/95 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl p-2 sm:p-3 flex flex-col gap-2">
            {/* Army Command Stance Buttons */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              <button
                onClick={() => onSetCommand('attack')}
                className={`py-2 px-1 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 border transition-all active:scale-95 ${
                  snapshot.armyCommand === 'attack'
                    ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white border-rose-400 shadow-lg shadow-rose-950/40 ring-2 ring-rose-400/50'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>HÜCUM!</span>
              </button>

              <button
                onClick={() => onSetCommand('defend')}
                className={`py-2 px-1 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 border transition-all active:scale-95 ${
                  snapshot.armyCommand === 'defend'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-blue-400 shadow-lg shadow-blue-950/40 ring-2 ring-blue-400/50'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>SAVUN</span>
              </button>

              <button
                onClick={() => onSetCommand('rally')}
                className={`py-2 px-1 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 border transition-all active:scale-95 ${
                  snapshot.armyCommand === 'rally'
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-white border-amber-400 shadow-lg shadow-amber-950/40 ring-2 ring-amber-400/50'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>TOPLAN</span>
              </button>

              <button
                onClick={() => setShowUpgradesModal(true)}
                className="py-2 px-1 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 bg-gradient-to-r from-emerald-700 to-teal-600 hover:brightness-110 text-white border border-emerald-400 shadow-md active:scale-95 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>GELİŞTİR</span>
              </button>
            </div>

            {/* Unit Deployment Cards */}
            <div className="grid grid-cols-5 gap-1 sm:gap-2">
              {unitList.map((type, idx) => {
                const conf = UNIT_CONFIGS[type];
                const canAfford = snapshot.gold >= conf.cost;
                const icons: Record<UnitType, string> = {
                  infantry: '⚔️',
                  archer: '🏹',
                  knight: '🛡️',
                  mage: '🧙',
                  catapult: '🎯'
                };

                return (
                  <button
                    key={type}
                    disabled={!canAfford}
                    onClick={() => onSpawnUnit(type)}
                    className={`flex flex-col items-center justify-center py-1.5 sm:py-2.5 px-1 rounded-xl border transition-transform duration-100 active:scale-90 ${
                      canAfford
                        ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-600 hover:border-amber-400 hover:from-slate-750 shadow-md cursor-pointer'
                        : 'bg-slate-950/70 border-slate-800 text-slate-600 cursor-not-allowed opacity-55'
                    }`}
                  >
                    <span className="text-lg sm:text-2xl drop-shadow mb-0.5">
                      {icons[type]}
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold text-slate-100 leading-tight">
                      {conf.name}
                    </span>
                    <span
                      className={`text-[10px] sm:text-[11px] font-semibold mt-0.5 ${
                        canAfford ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    >
                      💰 {conf.cost}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
