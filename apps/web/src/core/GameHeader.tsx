import {
  coreLevel,
  pace,
  stationName,
  type CoreState,
} from "@railway/simulation";
import { clock, compact } from "./presentation";
export function GameHeader({ state: s }: { state: CoreState }) {
  const level = coreLevel(s),
    inLevel = level.xp % 100;
  return (
    <header className="game-header game-hud">
      <div className="game-brand">
        <svg
          viewBox="0 0 64 64"
          role="img"
          aria-label="Logo Indonesia Railway Manager"
        >
          <path fill="#c7352d" d="M7 7h50v25H7z" />
          <path fill="#fff8ed" d="M7 32h50v25H7z" />
          <path
            d="M19 53 25 15h14l6 38M20 43h24M23 29h18"
            stroke="#183b3c"
            strokeWidth="5"
            fill="none"
          />
          <path d="M25 17h14v12H25z" fill="#f0c369" />
        </svg>
        <div>
          <b>
            INDONESIA
            <br />
            <span>RAILWAY MANAGER</span>
          </b>
          <small>{stationName(s.hub)}</small>
        </div>
      </div>
      <div className="hud-xp">
        <b>
          LEVEL {level.level}
          <span>{inLevel} / 100 XP</span>
        </b>
        <div
          role="progressbar"
          aria-label="XP menuju level berikutnya"
          aria-valuenow={inLevel}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${inLevel}%` }} />
        </div>
      </div>
      <div className="hud-reputation">
        <b>
          REPUTASI <span>{s.reputation.toFixed(0)}%</span>
        </b>
        <div
          className="reputation-stars"
          role="img"
          aria-label={`Reputasi ${s.reputation.toFixed(1)} persen dari 10 bintang`}
        >
          <span>★★★★★★★★★★</span>
          <i style={{ width: `${Math.max(0, Math.min(100, s.reputation))}%` }}>
            ★★★★★★★★★★
          </i>
        </div>
      </div>
      <div className="hud-cash">
        <small>KAS OPERASI</small>
        <b>{compact(s.cash)}</b>
      </div>
      <div className="hud-clock">
        <b>
          {clock(s.minute)} <small>WIB</small>
        </b>
        <span>
          Hari {Math.floor(s.minute / 1440) + 1} · {pace(s)}×
        </span>
      </div>
    </header>
  );
}
