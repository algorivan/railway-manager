import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, SimulationSpeed, SimulationEngine } from '@railway/simulation';
import { createInitialWebGameState, DEFAULT_WEB_CONFIG } from './gameStateInit';
import { TopStatusBar } from './components/TopStatusBar';
import { Sidebar, ScreenTab } from './components/Sidebar';
import { NetworkMapScreen } from './components/NetworkMapScreen';
import { TimetableScreen } from './components/TimetableScreen';
import { FleetScreen } from './components/FleetScreen';
import { ProcurementScreen } from './components/ProcurementScreen';
import { FinanceScreen } from './components/FinanceScreen';
import { MissionsScreen } from './components/MissionsScreen';
import { WorkforceScreen } from './components/WorkforceScreen';
import { ContractsScreen } from './components/ContractsScreen';
import { ProcurementOrderEntity } from '@railway/procurement';
import { JAVA_ROLLING_STOCK_CATALOG } from '@railway/game-data';
import { createBrandedId, createGameTimestamp, toMoney, OrderId, TransactionId } from '@railway/shared';

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => createInitialWebGameState());
  const [activeTab, setActiveTab] = useState<ScreenTab>('network');
  const [recentNotification, setRecentNotification] = useState<string | null>(
    'Selamat datang di Railway Network Manager Indonesia! Jalur Gambir - Bandung siap diberangkatkan.'
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
      setRecentNotification(`Simulasi dimajukan ${minutes} menit.`);
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

        // Run tick with DISPATCH_SERVICE action
        const wasPaused = prev.speed === 'PAUSED';
        const res = engine.simulateTick(
          { ...prev, speed: wasPaused ? '1X' : prev.speed },
          [{ type: 'DISPATCH_SERVICE', slotId: slotId as any }],
          DEFAULT_WEB_CONFIG,
          2026
        );

        setRecentNotification(`KA ${slot.routeId} berhasil diberangkatkan dari stasiun awal.`);
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
      setRecentNotification('Semua armada kereta api sedang aktif dalam perjalanan.');
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
        // Record procurement order
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

        // Deduct payment via ledger
        prev.generalLedger.postTransaction({
          id: createBrandedId<TransactionId>(`TX_${Date.now()}`),
          companyId: prev.companyId,
          timestamp: prev.timestamp,
          category: 'CAPEX_ROLLING_STOCK_PURCHASE',
          amount: toMoney(-totalCost),
          description: `Uang Muka Pemesanan ${quantity}x ${spec.modelName} ke pabrikan INKA`,
        });

        setRecentNotification(`Pemesanan ${quantity} unit ${spec.modelName} berhasil diajukan.`);
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
      case 'finance':
        return <FinanceScreen state={gameState} />;
      case 'missions':
        return <MissionsScreen state={gameState} />;
      case 'workforce':
        return <WorkforceScreen state={gameState} />;
      case 'contracts':
        return <ContractsScreen state={gameState} />;
      default:
        return <NetworkMapScreen state={gameState} onDispatchSlot={handleDispatchSlot} />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#020617] font-sans antialiased text-slate-100">
      {/* Top Global Status Bar */}
      <TopStatusBar
        state={gameState}
        onSetSpeed={handleSetSpeed}
        onStepMinutes={handleStepMinutes}
        onQuickDispatch={handleQuickDispatch}
      />

      {/* Main Layout: Sidebar Navigation + Active Screen Canvas */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          unfulfilledContractsCount={gameState.b2bContracts.length}
          activeAlertsCount={gameState.activeServices.length > 0 ? 1 : 0}
        />

        {/* Screen View Container */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Notification / Dispatch ticker bar */}
          {recentNotification && (
            <div className="bg-[#1E293B] border-b border-[#334155] px-6 py-1.5 flex items-center justify-between text-xs font-mono text-slate-300">
              <div className="flex items-center space-x-2 truncate">
                <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                <span className="text-[#F97316] font-bold">INFO OPERASIONAL:</span>
                <span className="truncate">{recentNotification}</span>
              </div>
              <button
                onClick={() => setRecentNotification(null)}
                className="text-slate-400 hover:text-white text-xs ml-4"
              >
                ✕
              </button>
            </div>
          )}

          {renderScreen()}
        </main>
      </div>
    </div>
  );
};

export default App;
