import { useRef, useState, type PointerEvent } from "react";
import { forecastCore, previewCoreDiagram, coreDutyTurnaround, stationName, type CoreDuty, type CoreState } from "@railway/simulation";
import { clock, when } from "./presentation";

type Props = { state: CoreState; trainsetId: string; cycle: number; duties: CoreDuty[]; onChange: (duties: CoreDuty[]) => void };
export function TimetableEditor({ state: s, trainsetId, cycle, duties, onChange }: Props) {
  const [day, setDay] = useState(0), [fromHour, setFromHour] = useState(0), [toHour, setToHour] = useState(24);
  const drag = useRef<{ index: number; x: number; offset: number; width: number } | null>(null);
  const visibleDay = Math.min(day, cycle / 1440 - 1);
  const from = visibleDay * 1440 + fromHour * 60, to = visibleDay * 1440 + toHour * 60, span = to - from;
  const preview = previewCoreDiagram(s, trainsetId, cycle, duties);
  const runs = duties.map((d) => forecastCore(s, trainsetId, d.serviceId, d.reverse, d.offset));
  const update = (index: number, patch: Partial<CoreDuty>) => onChange(duties.map((d, i) => i === index ? { ...d, ...patch } : d));
  const snap = (minute: number) => Math.max(0, Math.min(cycle - 1, Math.round(minute / 15) * 15));
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current) return;
    update(current.index, { offset: snap(current.offset + (event.clientX - current.x) / current.width * span) });
  }
  const clashes = runs.map((run, i) => runs.some((other, j) => {
    if (i === j) return false;
    const a = run.start <= other.start ? run : other, b = a === run ? other : run;
    return a.end + coreDutyTurnaround(a, b) > b.start;
  }));
  const clip = (start: number, end: number) => ({ left: `${Math.max(0, (start - from) / span * 100)}%`, width: `${Math.max(0, (Math.min(end, to) - Math.max(start, from)) / span * 100)}%` });
  return <div className="timetable-editor">
    <h4>Timetable · blok waktu</h4>
    <p className="muted">Geser blok untuk memindahkan keberangkatan per 15 menit, atau klik jalur waktunya. Pemilih jam memberi ketepatan satu menit. Durasi perjalanan mengikuti lintas, rangkaian dan pemberhentian; blok arsiran adalah jeda persiapan.</p>
    <div className="field-pair timetable-window">
      <label>Hari tampilan<select aria-label="Hari tampilan timetable" value={visibleDay} onChange={(e) => setDay(Number(e.target.value))}>
        {Array.from({ length: cycle / 1440 }, (_, i) => <option key={i} value={i}>Hari {i + 1}</option>)}
      </select></label>
      <label>Dari jam<select aria-label="Awal tampilan timetable" value={fromHour} onChange={(e) => { const hour = Number(e.target.value); setFromHour(hour); if (toHour <= hour) setToHour(hour + 1); }}>
        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>)}
      </select></label>
      <label>Sampai jam<select aria-label="Batas tampilan timetable" value={toHour} onChange={(e) => { const hour = Number(e.target.value); setToHour(hour); if (fromHour >= hour) setFromHour(hour - 1); }}>
        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i + 1}>{String(i + 1).padStart(2, "0")}:00</option>)}
      </select></label>
    </div>
    <div className="timetable-scroll">
      <div className="timetable-grid" style={{ minWidth: Math.max(280, (toHour - fromHour) * 26) }}>
        <div className="timetable-axis">{Array.from({ length: toHour - fromHour + 1 }, (_, i) => <span key={i} style={{ left: `${i / (toHour - fromHour) * 100}%` }}>{String(fromHour + i).padStart(2, "0")}:00</span>)}</div>
        {runs.map((run, i) => {
          const following = runs.filter((_, j) => j !== i).sort((a, b) => a.start - b.start).find((r) => r.start > run.start) ?? [...runs].sort((a, b) => a.start - b.start)[0];
          const rest = coreDutyTurnaround(run, following);
          const overlapCycle = runs.some((other, j) => i !== j && run.end + coreDutyTurnaround(run, other) > other.start + cycle);
          const clash = clashes[i] || overlapCycle;
          return <div className="timetable-lane" key={i} aria-label={`Jalur waktu perjalanan ${i + 1}`} onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const rect = event.currentTarget.getBoundingClientRect(); update(i, { offset: snap(from + (event.clientX - rect.left) / rect.width * span) });
          }}>
            {Array.from({ length: toHour - fromHour + 1 }, (_, h) => <i className="timetable-gridline" key={h} style={{ left: `${h / (toHour - fromHour) * 100}%` }} />)}
            {[0, cycle].map((shift) => {
              const start = run.start - shift, end = run.end - shift;
              return <div key={shift}>
                {end + rest > from && end < to && <span className="timetable-rest" style={clip(end, end + rest)} title={`Jeda ${rest} menit`} />}
                {end > from && start < to && <button type="button" className={`timetable-block ${clash ? "conflict" : ""}`} style={clip(start, end)} aria-label={`Blok perjalanan ${i + 1}`} title={`${stationName(run.origin)} → ${stationName(run.destination)} · ${when(run.start)}–${when(run.end)}`} onClick={(e) => e.stopPropagation()}
                  onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { index: i, x: event.clientX, offset: duties[i]!.offset, width: event.currentTarget.parentElement!.parentElement!.getBoundingClientRect().width }; }}
                  onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
                  onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); update(i, { offset: Math.max(0, Math.min(cycle - 1, duties[i]!.offset + (event.key === "ArrowLeft" ? -15 : 15))) }); } }}>
                  {i + 1}. {clock(run.start)} → {clock(run.end)}
                </button>}
              </div>;
            })}
          </div>;
        })}
      </div>
    </div>
    {!duties.length && <p className="muted">Tambahkan perjalanan pergi atau balik untuk mulai menyusun blok.</p>}
    <p className="timetable-legend"><span>■ Perjalanan</span><span>▧ Jeda</span><span className="warning-text">■ Bentrok waktu</span></p>
    {duties.map((d, i) => <div className="timetable-duty" key={i}>
      <b>Perjalanan {i + 1} · {stationName(runs[i]!.origin)} → {stationName(runs[i]!.destination)}</b>
      <div className="field-pair">
        <label>Relasi<select aria-label={`Relasi perjalanan ${i + 1}`} value={d.serviceId} onChange={(e) => update(i, { serviceId: e.target.value })}>{s.services.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label>Arah<select aria-label={`Arah perjalanan ${i + 1}`} value={String(d.reverse)} onChange={(e) => update(i, { reverse: e.target.value === "true" })}><option value="false">Stasiun awal → tujuan</option><option value="true">Tujuan → stasiun awal</option></select></label>
        <label>Hari<select aria-label={`Hari perjalanan ${i + 1}`} value={Math.floor(d.offset / 1440)} onChange={(e) => update(i, { offset: Number(e.target.value) * 1440 + d.offset % 1440 })}>{Array.from({ length: cycle / 1440 }, (_, day) => <option key={day} value={day}>Hari {day + 1}</option>)}</select></label>
        <label>Berangkat<input aria-label={`Jam perjalanan ${i + 1}`} type="time" value={clock(d.offset)} onChange={(e) => { if (!e.target.value) return; const [h, m] = e.target.value.split(":").map(Number); update(i, { offset: Math.floor(d.offset / 1440) * 1440 + h! * 60 + m! }); }} /></label>
      </div>
      <small>Estimasi tiba {when(runs[i]!.end)} · perjalanan {Math.ceil(runs[i]!.end - runs[i]!.start)} menit game</small>
      <button aria-label={`Hapus perjalanan ${i + 1}`} onClick={() => onChange(duties.filter((_, j) => j !== i))}>Hapus dinas</button>
    </div>)}
    <div className={`readiness ${preview.issues.length ? "warning" : ""}`} aria-live="polite">
      <div><b>{preview.issues.length ? "Pola perlu disesuaikan" : "Pola tersambung dan waktu mencukupi"}</b>{preview.issues.map((issue) => <p key={issue}>{issue}</p>)}</div>
    </div>
    <p className="muted">Jadwal ini diulang setiap {cycle / 1440} hari game. Blok melewati tengah malam tampil pada hari berikutnya; blok yang melewati akhir periode jadwal tampil lagi di hari pertama jadwal berikutnya. Estimasi belum menjamin blok lintas bebas saat keberangkatan.</p>
  </div>;
}
