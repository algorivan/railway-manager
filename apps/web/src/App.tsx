import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, SimulationSpeed, SimulationEngine } from '@railway/simulation';
import { createInitialWebGameState, DEFAULT_WEB_CONFIG } from './gameStateInit';
import { MobileHeader } from './components/MobileHeader';
import { FloatingActionDock, FloatingTab } from './components/FloatingActionDock';
import { NetworkMapScreen } from './components/NetworkMapScreen';
import { TimetableScreen } from './components/TimetableScreen';
import { FleetScreen } from './components/FleetScreen';
import { ProcurementScreen } from './components/ProcurementScreen';
import { ManagementHubScreen } from './components/ManagementHubScreen';
import { ActionResponseModal, ActionFeedbackData } from './components/ActionResponseModal';
import { ProcurementOrderEntity } from '@railway/procurement';
import { JAVA_ROLLING_STOCK_CATALOG } from '@railway/game-data';
import { CAMPAIGN_MISSION_CATALOG } from '@railway/missions';
import { createBrandedId, createGameTimestamp, toMoney, OrderId, TransactionId } from '@railway/shared';
import { formatRupiah } from '@railway/ui';
import { Smartphone, Monitor, X } from 'lucide-react';
import { soundEffects } from './utils/soundEffects';

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => createInitialWebGameState());
  const [activeTab, setActiveTab] = useState<FloatingTab>('network');
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [isDeviceFrameMode, setIsDeviceFrameMode] = useState<boolean>(false); // default to clean full-screen map
  const [actionFeedback, setActionFeedback] = useState<ActionFeedbackData | null>(null);
  const [tickerMessage, setTickerMessage] = useState<string | null>(
    'Peta Operasi OpenStreetMap aktif. Klik stasiun atau jalur rel untuk informasi rute.'
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
        if (isRunning) {
          soundEffects.playClickSound();
          setActionFeedback({
            type: 'INFO',
            title: `KA ${slot.id} Sedang Beroperasi`,
            subtitle: `Rangkaian kereta KA ${slot.id} saat ini masih dalam perjalanan dinas di petak jalan lintas. Tunggu hingga tiba di stasiun akhir sebelum dapat diberangkatkan kembali.`,
            badge: 'SEDANG BERDINAS',
            details: [
              { label: 'Nomor Perjalanan', value: slot.id },
              { label: 'Rute Lintas', value: slot.routeId },
              { label: 'Status Operasi', value: 'Sedang Berjalan di Lintas', highlight: true },
            ],
            closeLabel: 'Mengerti',
          });
          return prev;
        }

        const wasPaused = prev.speed === 'PAUSED';
        const res = engine.simulateTick(
          { ...prev, speed: wasPaused ? '1X' : prev.speed },
          [{ type: 'DISPATCH_SERVICE', slotId: slotId as any }],
          DEFAULT_WEB_CONFIG,
          2026
        );

        soundEffects.playDispatchWhistle();
        const routeObj = (prev.routes ?? []).find((r) => r.id === slot.routeId);
        const depHour = Math.floor(slot.departureMinuteOfDay / 60).toString().padStart(2, '0');
        const depMin = (slot.departureMinuteOfDay % 60).toString().padStart(2, '0');

        setActionFeedback({
          type: 'DISPATCH',
          title: `KA ${slot.id} Berhasil Diberangkatkan!`,
          subtitle: `Semboyan 40 (izin PPKA) dan Semboyan 41 (kondektur) telah dibunyikan. Masinis membalas dengan Semboyan 35, rangkaian meluncur ke jalur utama lintas.`,
          badge: 'SEMBOYAN 40 DIBERIKAN',
          details: [
            { label: 'Nomor KA', value: slot.id },
            { label: 'Rute Pelayanan', value: routeObj?.name ?? slot.routeId },
            { label: 'Jadwal Berangkat', value: `${depHour}:${depMin} WIB` },
            { label: 'Tipe Rangkaian', value: slot.compositionId ? `Formasi ${slot.compositionId}` : 'Eksekutif Stainless Steel' },
            { label: 'Sinyal Berangkat', value: 'Aspek Hijau (Aman ke Petak Jalan)', highlight: true },
          ],
          actionLabel: 'Pantau di Peta',
          onAction: () => {
            setIsSheetOpen(false);
            setActiveTab('network');
          },
          closeLabel: 'Lanjut Operasi',
        });

        setTickerMessage(`KA ${slot.id} (${routeObj?.name ?? slot.routeId}) berhasil meluncur ke lintas.`);
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
      soundEffects.playClickSound();
      setActionFeedback({
        type: 'INFO',
        title: 'Semua Armada Sedang Berdinas',
        subtitle: 'Seluruh armada kereta api yang tersedia saat ini sedang aktif berdinas melayani perjalanan penumpang di lintas petak jalan Jawa.',
        badge: 'LINTAS PENUH',
        details: [
          { label: 'KA Beroperasi', value: `${gameState.activeServices.length} Rangkaian KA` },
          { label: 'Total Slot Jadwal', value: `${gameState.timetableSlots.length} Jadwal` },
          { label: 'Status Jalur', value: 'Optimal Melayani Penumpang', highlight: true },
        ],
        closeLabel: 'Mengerti',
      });
      setTickerMessage('Semua armada kereta sedang aktif beroperasi.');
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
        soundEffects.playClickSound();
        setActionFeedback({
          type: 'WARNING',
          title: 'Kas Likuid Tidak Mencukupi',
          subtitle: `Perusahaan tidak memiliki saldo kas likuid yang cukup untuk memesan ${quantity}x unit sarana ${spec.modelName} ke pabrikan PT INKA.`,
          badge: 'DANA TIDAK CUKUP',
          details: [
            { label: 'Sarana yang Dipesan', value: `${quantity}x ${spec.modelName}` },
            { label: 'Total Biaya Diperlukan', value: formatRupiah(totalCost) },
            { label: 'Saldo Kas Saat Ini', value: formatRupiah(currentCash) },
            { label: 'Kekurangan Modal', value: formatRupiah(totalCost - currentCash), highlight: true },
          ],
          closeLabel: 'Tutup',
        });
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

        soundEffects.playCashChime();

        setActionFeedback({
          type: 'PURCHASE',
          title: `Pesanan ${spec.modelName} Sukses Dipesan!`,
          subtitle: `Purchase Order resmi berhasil diterbitkan ke PT Industri Kereta Api (INKA) Madiun. Sarana langsung didaftarkan ke lini perakitan pabrik.`,
          badge: 'PESANAN SUKSES DIBELI',
          details: [
            { label: 'Model Sarana', value: `${spec.modelName} (${spec.category})` },
            { label: 'Jumlah Dipesan', value: `${quantity} Unit Baru` },
            { label: 'Total Investasi (CAPEX)', value: formatRupiah(totalCost), highlight: true },
            { label: 'Dipo Penerima', value: prev.depots[0]?.name ?? 'Dipo Bandung (BD)' },
            { label: 'Estimasi Lead Time', value: `${spec.standardLeadTimeDays} Hari Kalender` },
            { label: 'Status Fabrikasi', value: 'Dalam Antrean Produksi INKA' },
          ],
          actionLabel: 'Lihat Antrean Pabrik',
          onAction: () => {
            setActiveTab('procurement');
            setIsSheetOpen(true);
          },
          closeLabel: 'Kembali',
        });

        setTickerMessage(`Pesanan ${quantity}x ${spec.modelName} berhasil diajukan ke INKA.`);
        return {
          ...prev,
          procurementOrders: Object.freeze([...prev.procurementOrders, newOrder]),
        };
      });
    },
    [gameState.generalLedger]
  );

  // Claim mission bonus
  const handleClaimMission = useCallback((missionId: string) => {
    const mission = CAMPAIGN_MISSION_CATALOG.find((m) => m.id === missionId);
    if (!mission) return;

    setGameState((prev) => {
      prev.generalLedger.postTransaction({
        id: createBrandedId<TransactionId>(`TX_REWARD_${Date.now()}`),
        companyId: prev.companyId,
        timestamp: prev.timestamp,
        category: 'REV_GOVERNMENT_SUBSIDY',
        amount: toMoney(mission.rewards.cashBonus),
        description: `Hadiah Penyelesaian Misi: ${mission.title}`,
      });

      soundEffects.playSuccessChime();

      setActionFeedback({
        type: 'MISSION',
        title: `Bonus Misi: ${mission.title}`,
        subtitle: `Sasaran strategis DJKA telah terpenuhi. Bonus apresiasi operasional telah dikreditkan langsung ke rekening kas perusahaan.`,
        badge: 'SASARAN TERCAPAI',
        details: [
          { label: 'Tahap Kampanye', value: `Tahap ${mission.stage}` },
          { label: 'Target Misi', value: mission.title },
          { label: 'Bonus Kas Tunai', value: `+ ${formatRupiah(mission.rewards.cashBonus)}`, highlight: true },
          { label: 'Apresiasi Regulator', value: '+5% Akreditasi DJKA' },
          { label: 'Status Klaim', value: 'Dana Cair ke Rekening' },
        ],
        closeLabel: 'Terima Kasih',
      });

      setTickerMessage(`Hadiah misi ${mission.title} (+${formatRupiah(mission.rewards.cashBonus)}) berhasil diklaim.`);
      return {
        ...prev,
        reputation: Math.min(1.0, prev.reputation + 0.05),
      };
    });
  }, []);

  // Rest employee at depot
  const handleRestEmployee = useCallback((employeeId: string) => {
    setGameState((prev) => {
      const emp = prev.employees.find((e) => e.id === employeeId);
      if (!emp) return prev;

      soundEffects.playRestSound();

      setActionFeedback({
        type: 'REST',
        title: `Kru ${emp.name} Selesai Istirahat`,
        subtitle: `Kru telah menggunakan fasilitas istirahat mess dipo ${emp.homeDepotId}. Seluruh tingkat kelelahan terhapus dan kesiapan dinas telah pulih sempurna.`,
        badge: 'KEBUGARAN KRU PULIH',
        details: [
          { label: 'Nama Lengkap Kru', value: emp.name },
          { label: 'Tugas Operasional', value: emp.role },
          { label: 'Home Dipo', value: `Dipo ${emp.homeDepotId}` },
          { label: 'Tingkat Stamina', value: '100% Prima (Siap Dinas)', highlight: true },
          { label: 'Status Kesehatan', value: 'Fit to Work (Lolos Cek Medis)' },
        ],
        closeLabel: 'Selesai',
      });

      setTickerMessage(`Kru ${emp.name} telah selesai beristirahat di mess dipo.`);

      const updatedEmployees = prev.employees.map((e) => {
        if (e.id === employeeId) {
          return {
            ...e,
            fatigueLevel: 0,
          };
        }
        return e;
      });

      return {
        ...prev,
        employees: Object.freeze(updatedEmployees) as any,
      };
    });
  }, []);

  // Toggle Tab from Floating Action Dock
  const handleToggleTab = (tab: FloatingTab) => {
    if (tab === 'network') {
      setIsSheetOpen(false);
      setActiveTab('network');
    } else {
      if (activeTab === tab && isSheetOpen) {
        setIsSheetOpen(false);
      } else {
        setActiveTab(tab);
        setIsSheetOpen(true);
      }
    }
  };

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

  // Render Modal Sheet Content
  const renderModalContent = () => {
    switch (activeTab) {
      case 'timetable':
        return <TimetableScreen state={gameState} onDispatchSlot={handleDispatchSlot} />;
      case 'fleet':
        return <FleetScreen state={gameState} />;
      case 'procurement':
        return <ProcurementScreen state={gameState} onOrderSpec={handleOrderSpec} />;
      case 'hub':
        return (
          <ManagementHubScreen
            state={gameState}
            onClaimMission={handleClaimMission}
            onRestEmployee={handleRestEmployee}
          />
        );
      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (activeTab) {
      case 'timetable':
        return 'Jadwal & Dispatch KA';
      case 'fleet':
        return 'Armada & Formasi Dipo';
      case 'procurement':
        return 'Pengadaan Sarana INKA';
      case 'hub':
        return 'Kantor Pusat Direksi';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-100 flex items-center justify-center overflow-hidden">
      {/* Main App Container */}
      <div
        className={`w-full h-screen flex flex-col bg-white relative overflow-hidden transition-all duration-300 ${
          isDeviceFrameMode
            ? 'max-w-md h-[92vh] max-h-[880px] rounded-2xl border border-slate-300 shadow-2xl ring-1 ring-slate-200'
            : 'max-w-none'
        }`}
      >
        {/* Top Header HUD (Clean Light Theme) */}
        <MobileHeader
          state={gameState}
          onSetSpeed={handleSetSpeed}
          onStepMinutes={handleStepMinutes}
          onQuickDispatch={handleQuickDispatch}
        />

        {/* Operational Ticker Banner */}
        {tickerMessage && (
          <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-1 flex items-center justify-between text-[11px] font-mono text-slate-600 shrink-0 z-20">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
              <span className="truncate">{tickerMessage}</span>
            </div>
            <button
              onClick={() => setTickerMessage(null)}
              className="text-slate-400 hover:text-slate-700 ml-2 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Primary Screen: Operations Map (ALWAYS the root view!) */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <NetworkMapScreen state={gameState} onDispatchSlot={handleDispatchSlot} />

          {/* Centered Pop-up Modal with Blurry Background Map */}
          {isSheetOpen && activeTab !== 'network' && (
            <div
              onClick={() => setIsSheetOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
            >
              {/* Modal Dialog Card (Click-propagation stopped) */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg md:max-w-xl max-h-[84vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
              >
                {/* Modal Header Bar */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <h3 className="font-bold text-sm text-slate-900 font-mono">
                      {getModalTitle()}
                    </h3>
                  </div>

                  <button
                    onClick={() => setIsSheetOpen(false)}
                    className="w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors"
                    title="Tutup Modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                  {renderModalContent()}
                </div>
              </div>
            </div>
          )}

          {/* Floating Action Dock: Bottom Right Aligned, Icon Only, No Text */}
          <FloatingActionDock
            activeTab={activeTab}
            isSheetOpen={isSheetOpen}
            onToggleTab={handleToggleTab}
            unfulfilledContractsCount={gameState.b2bContracts.length}
            activeMissionsCount={2}
          />

          {/* Action Confirmation & Response Dialog Modal */}
          <ActionResponseModal
            data={actionFeedback}
            onClose={() => setActionFeedback(null)}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
