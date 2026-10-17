import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine.ts';
import { HUD } from './components/HUD.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { soundSystem } from './game/audio.ts';
import type {
  GameStatus,
  GameResult,
  Difficulty,
  BattlefieldSnapshot,
  UnitType,
  ArmyCommand,
  UpgradeLevels,
  GameStats
} from './game/types.ts';
import { RotateCcw, Play, Volume2, VolumeX } from 'lucide-react';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameStatus>('title');
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [finalStats, setFinalStats] = useState<GameStats>({
    kills: 0,
    playerUnitsLost: 0,
    playerUnitsSpawned: 0,
    enemyUnitsKilled: 0,
    totalGoldEarned: 0,
    totalGoldSpent: 0,
    battleDurationSeconds: 0,
    starsEarned: 0,
    totalLevelUps: 0,
    topHeroUnit: null
  });

  const [snapshot, setSnapshot] = useState<BattlefieldSnapshot>({
    playerCount: 0,
    enemyCount: 0,
    playerBaseHp: 1200,
    enemyBaseHp: 1200,
    maxBaseHp: 1200,
    gold: 70,
    goldPerSecond: 5,
    armyCommand: 'attack',
    timeRemainingOrElapsed: 0,
    currentWave: 1,
    veteranCount: 0,
    topHero: null
  });

  const [upgrades, setUpgrades] = useState<UpgradeLevels>({
    goldMine: 0,
    weaponForge: 0,
    armorPlating: 0,
    towerDefense: 0
  });

  // Mirror game state to document.body.dataset.state for ultra-mode verification & CSS
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Initialize GameEngine once
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new GameEngine(mountRef.current);
    engineRef.current = engine;

    engine.onSnapshotUpdate = (snap) => {
      setSnapshot(snap);
      setUpgrades({ ...engine.upgrades });
    };

    engine.onGameOver = (result, stats) => {
      setGameResult(result);
      setFinalStats({ ...stats });
      setGameState('gameover');
    };

    // Check ?autostart=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startGame('normal');
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const startGame = useCallback((difficulty: Difficulty = 'normal') => {
    if (!engineRef.current) return;
    setGameResult(null);
    setGameState('playing');
    engineRef.current.startBattle(difficulty);
  }, []);

  const handleSpawnUnit = useCallback((type: UnitType) => {
    if (!engineRef.current || gameState !== 'playing') return;
    engineRef.current.spawnPlayerUnit(type);
  }, [gameState]);

  const handleSetCommand = useCallback((cmd: ArmyCommand) => {
    if (!engineRef.current || gameState !== 'playing') return;
    engineRef.current.setCommand(cmd);
  }, [gameState]);

  const handleBuyUpgrade = useCallback((type: keyof UpgradeLevels) => {
    if (!engineRef.current || gameState !== 'playing') return;
    engineRef.current.buyUpgrade(type);
    setUpgrades({ ...engineRef.current.upgrades });
  }, [gameState]);

  const handleTogglePause = useCallback(() => {
    if (!engineRef.current || (gameState !== 'playing' && gameState !== 'paused')) return;
    const newPaused = gameState === 'playing';
    engineRef.current.setPaused(newPaused);
    setGameState(newPaused ? 'paused' : 'playing');
  }, [gameState]);

  const handleToggleMute = useCallback(() => {
    const muted = soundSystem.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleJumpCamera = useCallback((preset: 'playerBase' | 'midfield' | 'enemyBase') => {
    if (!engineRef.current) return;
    engineRef.current.jumpToCamera(preset);
  }, []);

  const handleRestart = useCallback(() => {
    startGame(engineRef.current?.difficulty || 'normal');
  }, [startGame]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startGame('normal');
        }
        return;
      }

      if (e.code === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleTogglePause();
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (gameState === 'playing') {
        if (e.key === '1') handleSpawnUnit('infantry');
        else if (e.key === '2') handleSpawnUnit('archer');
        else if (e.key === '3') handleSpawnUnit('knight');
        else if (e.key === '4') handleSpawnUnit('mage');
        else if (e.key === '5') handleSpawnUnit('catapult');
        else if (e.key === 'a' || e.key === 'A') handleSetCommand('attack');
        else if (e.key === 's' || e.key === 'S') handleSetCommand('defend');
        else if (e.key === 'r' || e.key === 'R') handleSetCommand('rally');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, startGame, handleTogglePause, handleToggleMute, handleSpawnUnit, handleSetCommand]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen onStart={startGame} />
      )}

      {/* In-Game Active HUD */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <HUD
          snapshot={snapshot}
          upgrades={upgrades}
          isPaused={gameState === 'paused'}
          isMuted={isMuted}
          onSpawnUnit={handleSpawnUnit}
          onSetCommand={handleSetCommand}
          onBuyUpgrade={handleBuyUpgrade}
          onTogglePause={handleTogglePause}
          onToggleMute={handleToggleMute}
          onRestart={handleRestart}
          onJumpCamera={handleJumpCamera}
        />
      )}

      {/* Paused Modal Card */}
      {gameState === 'paused' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-none select-none">
          <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center text-white">
            <h2 className="text-2xl font-bold mb-1 text-slate-100">Oyun Duraklatıldı</h2>
            <p className="text-xs text-slate-400 mb-6">Ordu komutanı mola verdi</p>

            <div className="w-full flex flex-col gap-3">
              <button
                type="button"
                onClick={handleTogglePause}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4" />
                <span>Devam Et</span>
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Savaşı Yeniden Başlat</span>
              </button>

              <button
                type="button"
                onClick={handleToggleMute}
                className="w-full py-2 bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 font-medium rounded-xl flex items-center justify-center gap-2 text-xs"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span>{isMuted ? 'Sesi Aç' : 'Sesi Kapat'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState === 'gameover' && (
        <GameOverModal
          result={gameResult}
          stats={finalStats}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
