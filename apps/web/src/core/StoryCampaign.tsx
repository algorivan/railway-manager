import { useEffect, useRef, useState } from "react";
import { BookOpen, CheckCircle2, LockKeyhole, ArrowRight, Flag } from "lucide-react";
import { CORE_STORY_CAMPAIGN, storyText as t, type StoryChapter } from "@railway/game-data";
import { coreStoryStatus, coreStoryCallbacks, coreMissionStatus, stationName, type CoreState } from "@railway/simulation";
import { compact, clock, type Act, type Screen } from "./presentation";
import "./story.css";

const chapters: readonly StoryChapter[] = CORE_STORY_CAMPAIGN.chapters;
const destinations = { fleet: "Buka armada", schedule: "Atur jadwal", market: "Buka pasar", office: "Buka kantor" };

export function StoryCampaign({ state: s, act, go, onContinue }: {
  state: CoreState; act: Act; go: (screen: Screen) => void; onContinue: () => void;
}) {
  const [replanning, setReplanning] = useState(false);
  const root = useRef<HTMLElement>(null);
  const status = coreStoryStatus(s), p = s.story;
  const callbacks = coreStoryCallbacks(s);
  const preparation = s.progression ? coreMissionStatus(s).find((m) => !m.completed) : undefined;
  useEffect(() => {
    root.current?.querySelector<HTMLElement>(".story-active-heading")?.focus();
  }, [p?.chapterIndex, p?.choiceId, !!status?.completion]);
  const previous = p?.history.at(-1);
  const previousChapter = chapters.find((c) => c.id === previous?.chapterId);
  const previousChoice = previousChapter?.choices.find((c) => c.id === previous?.choiceId);
  return (
    <section ref={root} className="story-campaign" aria-label="Campaign Jalur Kepercayaan">
      <header className="story-season">
        <div className="story-eyebrow"><BookOpen size={16} /> {t(CORE_STORY_CAMPAIGN.season)}</div>
        <h2>{t(CORE_STORY_CAMPAIGN.title)}</h2>
        {!p ? <p>{t(CORE_STORY_CAMPAIGN.premise)}</p> : <details className="story-premise"><summary>Kisah perusahaan</summary><p>{t(CORE_STORY_CAMPAIGN.premise)}</p></details>}
        <span className="story-hub">Hub cerita: {stationName(s.hub)}</span>
      </header>
      {!p ? (
        <div className="story-briefing">
          <h3>Perusahaan Anda, pilihan Anda.</h3>
          <p>Lima bab dengan dua pendekatan per bab. Pilihan mengubah target, hadiah, dan catatan cerita. Armada dan jaringan yang sudah Anda miliki tetap digunakan.</p>
          <p>Tidak ada batas waktu login. Dinas untuk tujuan cerita dihitung setelah Anda menerima pendekatan bab; perjalanan lama dan yang sudah berjalan tidak dihitung.</p>
          <button className="primary" onClick={() => act({ type: "startStory" })}>Mulai campaign <ArrowRight size={16} /></button>
        </div>
      ) : (
        <>
          <details className="story-route-list"><summary>Daftar bab · {p.history.length} / {chapters.length} selesai</summary>
          <ol className="story-roadmap" aria-label="Urutan bab campaign">
            {chapters.map((c, i) => (
              <li key={c.id} className={i === p.chapterIndex ? "current" : ""} aria-current={i === p.chapterIndex ? "step" : undefined}>
                <span>{p.history.some((h) => h.chapterId === c.id) ? <CheckCircle2 size={16} /> : i > p.chapterIndex ? <LockKeyhole size={14} /> : i + 1}</span>
                <b>{t(c.title)}</b>
              </li>
            ))}
          </ol>
          </details>
          {status?.finished ? (
            <div className="story-ending" role="status">
              <Flag size={28} /><h3>Musim pertama selesai.</h3>
              <p>{previousChoice ? t(previousChoice.outcome) : ""}</p>
              <p>Ratih menutup buku perjalanan pertama. Damar kembali ke depo, Sari ke peron. Perusahaan yang Anda bangun tetap berjalan; lanjutkan mengelola dan memperluasnya dari peta.</p>
              <button className="primary" onClick={onContinue}>Lanjutkan perusahaan <ArrowRight size={16} /></button>
            </div>
          ) : status?.chapter && (
            <>
              <article className="story-briefing">
                <div className="story-eyebrow">BAB {p.chapterIndex + 1} · {t(status.chapter.subtitle)}</div>
                <h3 className="story-active-heading" tabIndex={-1}>{t(status.chapter.title)}</h3>
                {previous && previous.chapterId !== status.chapter.id && <p className="story-previous">Sebelumnya: Anda memilih “{previousChoice ? t(previousChoice.title) : ""}”. Keputusan itu tersimpan dalam jurnal perusahaan.</p>}
                <p>{t(status.chapter.briefing)}</p>
                <blockquote><p>“{t(status.chapter.dialogue)}”</p><cite>{t(status.chapter.character)} · {t(status.chapter.role)}</cite></blockquote>
              </article>
              {callbacks.map((callback) => <aside className="story-memory" key={callback.line}><b>{t(callback.speaker)} mengingat keputusan Anda</b><p>{t(callback.line)}</p></aside>)}
              {(!status.choice || replanning) && !status.completion ? (
                <div className="story-choices" aria-label="Pilih pendekatan skenario">
                  <p className="story-rule">Pilih satu pendekatan. Anda dapat meninjau ulang pilihan selama bab belum selesai; waktu mulai dan riwayat dinas tidak direset.</p>
                  {status.chapter.choices.map((choice) => (
                    <article key={choice.id}>
                      <h4>{t(choice.title)}</h4><p>{t(choice.description)}</p>
                      <ul>{choice.goals.map((g) => <li key={g.metric}>{t(g.label)}: {g.target.toLocaleString("id-ID")}</li>)}</ul>
                      <div className="story-grant">Dana bab {compact(choice.cash)} · +{choice.xp} XP</div>
                      <button onClick={() => { if (act({ type: status.choice ? "storyReplan" : "storyChoice", choiceId: choice.id })) setReplanning(false); }}>Pilih: {t(choice.title)}</button>
                    </article>
                  ))}
                </div>
              ) : status.choice ? (
                <section className="story-objectives" aria-label="Tujuan bab aktif">
                  <div className="story-eyebrow">PILIHAN ANDA</div><h4>{t(status.choice.title)}</h4>
                  <p>{t(status.choice.description)}</p>
                  <p className="story-rule">Dinas baru yang membawa penumpang dan selesai normal dihitung sejak Hari {Math.floor(p.chapterStartedAt / 1440) + 1}, {clock(p.chapterStartedAt)}. Perjalanan recall dan kargo tidak dihitung.</p>
                  {p.chapterIndex === 0 && preparation && preparation.id !== "run" && (
                    <div className="story-preparation">
                      <b>Persiapan berikutnya: {preparation.title}</b>
                      <p>Selesaikan persiapan sarana dan operasi sebelum menjalankan dinas pertama. Panduan lengkap tersedia di tab Misi operasional.</p>
                      <button onClick={() => go(preparation.screen)}>Kerjakan persiapan <ArrowRight size={14} /></button>
                    </div>
                  )}
                  {!status.completion && <button onClick={() => setReplanning(true)}>Tinjau ulang pendekatan</button>}
                  {status.goals.map((goal) => (
                    <div className="story-goal" key={goal.metric}>
                      <div><span>{t(goal.label)}</span><b>{goal.current.toLocaleString("id-ID")} / {goal.target.toLocaleString("id-ID")}</b></div>
                      <progress aria-label={t(goal.label)} max={goal.target} value={Math.min(goal.current, goal.target)} />
                      {!status.completion && <button onClick={() => go(goal.screen)}>{destinations[goal.screen]} <ArrowRight size={14} /></button>}
                    </div>
                  ))}
                  <div className="story-grant">{status.completion ? "Dana bab diterima" : "Dana bab setelah semua target terpenuhi"}: {compact(status.choice.cash)} · +{status.choice.xp} XP</div>
                  <small>Dana campaign dicatat terpisah dari pendapatan layanan. Target resource harus terpenuhi bersamaan dengan target dinas.</small>
                </section>
              ) : null}
              {status.completion && (
                <div className="story-resolution" role="status">
                  <CheckCircle2 size={22} /><h4>Bab selesai</h4><p>{status.choice ? t(status.choice.outcome) : ""}</p>
                  <button className="primary" onClick={() => act({ type: "continueStory" })}>{p.chapterIndex === chapters.length - 1 ? "Baca epilog" : "Lanjutkan cerita"} <ArrowRight size={16} /></button>
                </div>
              )}
              <button className="story-map-return" onClick={onContinue}>Kembali ke peta · operasi tetap berjalan</button>
            </>
          )}
          {p.history.length > 0 && (
            <details className="story-journal">
              <summary>Jurnal keputusan · {p.history.length} bab selesai</summary>
              {p.history.map((entry) => {
                const chapter = chapters.find((c) => c.id === entry.chapterId)!;
                const choice = chapter.choices.find((c) => c.id === entry.choiceId)!;
                return <article key={entry.chapterId}><h4>{t(chapter.title)}</h4><b>{t(choice.title)}</b><p>{t(choice.outcome)}</p><small>Hari {Math.floor(entry.completedAt / 1440) + 1} · {clock(entry.completedAt)} · {compact(choice.cash)} dana bab · {choice.xp} XP</small></article>;
              })}
            </details>
          )}
        </>
      )}
    </section>
  );
}
