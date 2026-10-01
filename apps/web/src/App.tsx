import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, SimulationSpeed, SimulationEngine } from '@railway/simulation';
import { createInitialWebGameState, DEFAULT_WEB_CONFIG } from './gameStateInit';
import { MobileHeader } from './components/MobileHeader';
import { MobileBottomDock, MobileTab } from './components/MobileBottomDock';
import { NetworkMapScreen } from './components/NetworkMapScreen';
import { TimetableScreen } from './components/TimetableScreen';
import { FleetScreen } from './components/FleetScreen';
import { ProcurementScreen } from './components/ProcurementScreen';
import { ManagementHubScreen } from './components/ManagementHubScreen';
import { ProcurementOrderEntity } from '@railway/procurement';
import { JAVA_ROLLING_STOCK_CATALOG } from '@railway/game-data';
import { createBrandedId, createGameTimestamp, toMoney, OrderId, TransactionId } from '@railway/shared';
import { Smartphone, Monitor } from 'lucide-react';

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => createInitialWebGameState());
  const [activeTab, setActiveTab] = useState<MobileTab>('network');
  const [isDeviceFrameMode, setIsDeviceFrameMode] = useState<boolean>(true);
  const [tickerMessage, setTickerMessage] = useState<string | null>(
    'Lintas Gambir - Bandung siap diberangkatkan! Tap Dispatch untuk mulai.'
  );

  const engine = useMemo(() => new SimulationEngine(), []);

  // Set simulation speed
  const handleSetSpeed = useCallback((speed: SimulationSpeed) => {
    setGameState((prev) => ({ ...prev, speed }));
  }, []);

  // Step simulation forward manually by N minutes
  const handleStepMinutes = useCallback(
    (minutes: number) => {
      setGameState((prev) => {
        let curr: GameState = { ...prev, speed: '1X' };
        for (let i = 0; i < minutes; i++) {
          const res = engine.simulateTick(curr, [], DEFAULT_WEB_CONFIG, 2026 + i);
          curr = res.nextState;
        }
        return { ...curr, speed: prev.speed };
      });
      setTickerMessage(`Simulasi dimajukan +${minutes} menit.`);
    },
    [engine]
  );

  // Dispatch a specific timetable slot
  const handleDispatchSlot = useCallback(
    (slotId: string) => {
      setGameState((prev) => {
        const slot = prev.timetableSlots.find((s) => s.id === slotId);
        if (!slot) return prev;

        const isRunning = prev.activeServices.some((s) => s.timetableSlotId === slotId);
        if (isRunning) return prev;

        const wasPaused = prev.speed === 'PAUSED';
        const res = engine.simulateTick(
          { ...prev, speed: wasPaused ? '1X' : prev.speed },
          [{ type: 'DISPATCH_SERVICE', slotId: slotId as any }],
          DEFAULT_WEB_CONFIG,
          2026
        );

        setTickerMessage(`KA ${slot.routeId} berhasil meluncur ke lintas!`);
        return { ...res.nextState, speed: wasPaused ? 'PAUSED' : prev.speed };
      });
    },
    [engine]
  );

  // Quick dispatch first available slot
  const handleQuickDispatch = useCallback(() => {
    const availableSlot = gameState.timetableSlots.find(
      (slot) => !gameState.activeServices.some((s) => s.timetableSlotId === slot.id)
    );
    if (availableSlot) {
      handleDispatchSlot(availableSlot.id);
    } else {
      setTickerMessage('Semua armada kereta sedang aktif berjalan.');
    }
  }, [gameState.timetableSlots, gameState.activeServices, handleDispatchSlot]);

  // Handle procurement order of new rolling stock
  const handleOrderSpec = useCallback(
    (specId: string, quantity: number) => {
      const spec = JAVA_ROLLING_STOCK_CATALOG.find((s) => s.id === specId);
      if (!spec) return;

      const totalCost = spec.basePurchaseCost * quantity;
      const currentCash = gameState.generalLedger.currentCashBalance;

      if (currentCash < totalCost) {
        alert('Dana kas likuid tidak mencukupi untuk memesan sarana ini!');
        return;
      }

      setGameState((prev) => {
        const newOrder = new ProcurementOrderEntity({
          id: createBrandedId<OrderId>(`ORD_${Date.now()}`),
          companyId: prev.companyId,
          specId,
          quantity,
          unitCost: toMoney(spec.basePurchaseCost),
          deliveryDepotId: prev.depots[0]?.id ?? ('DEPOT_BD' as any),
          leadTimeDays: spec.standardLeadTimeDays,
          orderedTimestamp: prev.timestamp,
          expectedDeliveryTimestamp: createGameTimestamp(
            prev.timestamp.totalMinutes + spec.standardLeadTimeDays * 1440
          ),
          status: 'ORDERED',
        });

        prev.generalLedger.postTransaction({
          id: createBrandedId<TransactionId>(`TX_${Date.now()}`),
          companyId: prev.companyId,
          timestamp: prev.timestamp,
          category: 'CAPEX_ROLLING_STOCK_PURCHASE',
          amount: toMoney(-totalCost),
          description: `Uang Muka Pemesanan ${quantity}x ${spec.modelName} ke pabrikan INKA`,
        });

        setTickerMessage(`Pesanan ${quantity}x ${spec.modelName} berhasil masuk antrean pabrik INKA!`);
        return {
          ...prev,
          procurementOrders: Object.freeze([...prev.procurementOrders, newOrder]),
        };
      });
    },
    [gameState.generalLedger]
  );

  // Real-time interval driver based on simulation speed
  useEffect(() => {
    if (gameState.speed === 'PAUSED') {
      return;
    }

    let intervalMs = 1000;
    if (gameState.speed === '2X') intervalMs = 500;
    else if (gameState.speed === '4X') intervalMs = 250;
    else if (gameState.speed === '8X') intervalMs = 125;

    const timer = setInterval(() => {
      setGameState((prev) => {
        if (prev.speed === 'PAUSED') return prev;
        const res = engine.simulateTick(prev, [], DEFAULT_WEB_CONFIG, 2026);
        return res.nextState;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [gameState.speed, engine]);

  // Screen Tab renderer
  const renderScreen = () => {
    switch (activeTab) {
      case 'network':
        return <NetworkMapScreen state={gameState} onDispatchSlot={handleDispatchSlot} />;
      case 'timetable':
        return <TimetableScreen state={gameState} onDispatchSlot={handleDispatchSlot} />;
      case 'fleet':
        return <FleetScreen state={gameState} />;
      case 'procurement':
        return <ProcurementScreen state={gameState} onOrderSpec={handleOrderSpec} />;
      case 'hub':
        return <ManagementHubScreen state={gameState} />;
      default:
        return <NetworkMapScreen state={gameState} onDispatchSlot={handleDispatchSlot} />;
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#020617] flex items-center justify-center overflow-hidden">
      {/* Desktop Device Mode Toggle Bar (Floating subtle on top-right for desktop users) */}
      <div className="fixed top-3 right-3 z-50 hidden md:flex items-center space-x-1.5 bg-[#0F172A]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#334155] shadow-lg">
        <button
          onClick={() => setIsDeviceFrameMode((prev) => !prev)}
          className="text-xs font-mono text-slate-300 hover:text-white flex items-center space-x-1"
          title="Toggle tampilan frame smartphone"
        >
          {isDeviceFrameMode ? (
            <>
              <Monitor className="w-3.5 h-3.5 text-[#0EA5E9]" />
              <span>Layar Lebar</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Frame HP</span>
            </>
          )}
        </button>
      </div>

      {/* Main Container: Mobile Frame on Desktop or Full Responsive on Mobile */}
      <div
        className={`w-full h-screen flex flex-col bg-[#020617] relative overflow-hidden transition-all duration-300 ${
          isDeviceFrameMode
            ? 'max-w-md h-[92vh] max-h-[880px] rounded-3xl border-2 border-[#1E293B] shadow-[0_0_60px_rgba(249,115,22,0.15)] ring-1 ring-slate-800'
            : 'max-w-none'
        }`}
      >
        {/* Mobile Top HUD */}
        <MobileHeader
          state={gameState}
          onSetSpeed={handleSetSpeed}
          onStepMinutes={handleStepMinutes}
          onQuickDispatch={handleQuickDispatch}
        />

        {/* Operational Ticker Banner */}
        {tickerMessage && (
          <div className="bg-[#0F172A] border-b border-[#1E293B] px-3 py-1 flex items-center justify-between text-[11px] font-mono text-slate-300 shrink-0">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
              <span className="truncate">{tickerMessage}</span>
            </div>
            <button
              onClick={() => setTickerMessage(null)}
              className="text-slate-500 hover:text-white ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active Screen View */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {renderScreen()}
        </main>

        {/* Mobile Game Bottom Dock */}
        <MobileBottomDock
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          unfulfilledContractsCount={gameState.b2bContracts.length}
          activeMissionsCount={2}
        />
      </div>
    </div>
  );
};

export default App;
