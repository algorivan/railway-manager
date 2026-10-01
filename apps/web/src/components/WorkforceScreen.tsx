import React from 'react';
import { GameState } from '@railway/simulation';
import { BASE_MONTHLY_SALARIES } from '@railway/workforce';
import { formatRupiah } from '@railway/ui';
import { Users, Shield, HeartPulse, Clock, Award, Coffee, UserPlus } from 'lucide-react';

interface WorkforceScreenProps {
  readonly state: GameState;
}

export const WorkforceScreen: React.FC<WorkforceScreenProps> = ({ state }) => {
  const employees = state.employees;

  // Aggregate stats
  const totalEmployees = employees.length;
  const driversCount = employees.filter((e) => e.role === 'MASINIS').length;
  const conductorsCount = employees.filter((e) => e.role === 'KONDEKTUR').length;
  const totalPayrollEst = employees.reduce((sum, e) => {
    return sum + (BASE_MONTHLY_SALARIES[e.role] ?? 8_000_000);
  }, 0);

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[#020617] text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[#334155] gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#0EA5E9]" />
            <span>Manajemen Kru & Tenaga Kerja (Workforce)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Penugasan masinis bersertifikat, kondektur, teknisi pemeliharaan, serta pemantauan batas jam kerja & kelelahan (fatigue).
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => alert('Rekrutmen kru baru dapat diakses melalui Balai Pelatihan DAOP.')}
          className="flex items-center space-x-1.5 px-3 py-2 bg-[#0EA5E9] hover:bg-[#0284c7] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Rekrut Kru Tambahan</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 shadow-lg">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Total Pegawai Aktif</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {totalEmployees} Kru
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {driversCount} Masinis • {conductorsCount} Kondektur
          </div>
        </div>

        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 shadow-lg">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Beban Payroll Bulanan</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {formatRupiah(totalPayrollEst)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Termasuk tunjangan dinas lintas
          </div>
        </div>

        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 shadow-lg">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Tingkat Kelelahan Rata-Rata</div>
          <div className="text-xl font-bold font-mono text-[#10B981] mt-1">
            {Math.round(
              employees.reduce((acc, e) => acc + e.fatigueLevel, 0) / (employees.length || 1)
            )}% (Aman)
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Batas maksimal aman: 70%
          </div>
        </div>

        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 shadow-lg">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Kepatuhan UU Ketenagakerjaan</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            100% Terpenuhi
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Maks 8 jam dinas per hari
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="mt-6 bg-[#0F172A] border border-[#334155] rounded-xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-[#334155] flex items-center justify-between">
          <h3 className="font-bold text-sm text-white">Daftar Kru Operasional Terdaftar</h3>
          <span className="text-xs font-mono text-slate-400">{employees.length} Personel</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#1E293B]/60 text-slate-400 font-mono uppercase text-[10px] border-b border-[#334155]">
                <th className="py-3 px-4">Nama Pegawai</th>
                <th className="py-3 px-4">Peran (Role)</th>
                <th className="py-3 px-4">Dipo Pangkalan</th>
                <th className="py-3 px-4">Sertifikasi & Lisensi</th>
                <th className="py-3 px-4">Tingkat Kelelahan</th>
                <th className="py-3 px-4">Jam Kerja Bulan Ini</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 font-sans">
              {employees.map((emp) => {
                const fatigue = emp.fatigueLevel;
                const fatigueColor =
                  fatigue > 70 ? 'text-red-400 bg-red-500/20' : fatigue > 40 ? 'text-amber-400 bg-amber-500/20' : 'text-emerald-400 bg-emerald-500/20';

                return (
                  <tr key={emp.id} className="hover:bg-[#1E293B]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-xs">{emp.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.id}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1E293B] text-slate-300 border border-[#334155]">
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                      {emp.homeDepotId}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="text-xs">
                        {emp.certifiedLocomotiveSpecs && emp.certifiedLocomotiveSpecs.length > 0 ? (
                          <div className="font-mono text-[10px] text-[#0EA5E9]">
                            {emp.certifiedLocomotiveSpecs.join(', ')}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                      {emp.certifiedRouteIds && emp.certifiedRouteIds.length > 0 && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Lintas: {emp.certifiedRouteIds.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${fatigueColor}`}>
                          {fatigue}%
                        </span>
                        <div className="w-16 bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              fatigue > 70 ? 'bg-red-500' : fatigue > 40 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${fatigue}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      {emp.monthlyHoursWorked} Jam
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => alert(`Pegawai ${emp.name} dijadwalkan istirahat di Dipo.`)}
                        className="px-2.5 py-1 bg-[#1E293B] hover:bg-[#334155] text-slate-300 rounded text-xs font-mono border border-[#334155] inline-flex items-center space-x-1 transition-colors"
                      >
                        <Coffee className="w-3 h-3 text-amber-400" />
                        <span>Istirahatkan</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
