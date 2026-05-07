// Portfolio components — shared atoms used across all layouts
const { useState, useEffect, useRef, useMemo } = React;

// ───────── Accordion entry ─────────
function Entry({ id, header, meta, children, current, defaultOpen = false, density = "comfortable" }) {
  const [open, setOpen] = useState(defaultOpen);
  const padY = density === "compact" ? "pf-py-3" : "pf-py-5";
  return (
    <div className={`pf-entry ${open ? "is-open" : ""} ${current ? "is-current" : ""}`} id={id}>
      <button
        className={`pf-entry__header ${padY}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className="pf-entry__primary">
          {current && <span className="pf-live" aria-hidden="true"><span className="pf-live__core" /></span>}
          <div className="pf-entry__title">{header}</div>
        </div>
        <div className="pf-entry__meta">
          <span className="pf-entry__metaText">{meta}</span>
          <span className="pf-chev" aria-hidden="true">+</span>
        </div>
      </button>
      <div className="pf-entry__body" hidden={!open}>
        <div className="pf-entry__bodyInner">{children}</div>
      </div>
    </div>
  );
}

// ───────── Stack chips ─────────
function Stack({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="pf-stack" aria-label="Stack">
      {items.map(s => <li key={s} className="pf-stack__chip">{s}</li>)}
    </ul>
  );
}

// ───────── Image carousel ─────────
function Carousel({ images }) {
  const [i, setI] = useState(0);
  if (!images?.length) return null;
  const n = images.length;
  return (
    <div className="pf-carousel">
      <div className="pf-carousel__viewport">
        <img src={images[i].src} alt={images[i].alt} />
      </div>
      {n > 1 && (
        <div className="pf-carousel__controls">
          <button className="pf-carousel__btn" onClick={() => setI((i - 1 + n) % n)} aria-label="Previous">←</button>
          <span className="pf-carousel__counter">{i + 1} / {n}</span>
          <button className="pf-carousel__btn" onClick={() => setI((i + 1) % n)} aria-label="Next">→</button>
        </div>
      )}
    </div>
  );
}

// ───────── Custom video player ─────────
function VideoPlayer({ src }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [time, setTime] = useState({ cur: 0, dur: 0 });
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onTime = () => {
      setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
      setTime({ cur: v.currentTime, dur: v.duration || 0 });
    };
    const onMeta = () => setTime({ cur: 0, dur: v.duration || 0 });
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const seek = (e) => {
    const v = ref.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  };

  const cycleSpeed = () => {
    const v = ref.current;
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : speed === 2 ? 0.5 : 1;
    setSpeed(next);
    if (v) v.playbackRate = next;
  };

  const fs = () => {
    const el = ref.current?.parentElement?.parentElement;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div className="pf-video">
      <div className="pf-video__viewport" onClick={toggle}>
        <video ref={ref} preload="metadata">
          <source src={src} type="video/mp4" />
        </video>
        {!playing && (
          <button className="pf-video__bigPlay" aria-label="Play" onClick={(e) => { e.stopPropagation(); toggle(); }}>
            <span className="pf-video__tri" />
          </button>
        )}
      </div>
      <div className="pf-video__dock">
        <div className="pf-video__progress" onClick={seek}>
          <div className="pf-video__progressFill" style={{ width: `${progress}%` }} />
        </div>
        <div className="pf-video__row">
          <div className="pf-video__left">
            <button className="pf-video__btn" onClick={toggle} aria-label="Play/pause">
              {playing ? "⏸" : "▶"}
            </button>
            <span className="pf-video__time">{fmt(time.cur)} / {fmt(time.dur)}</span>
          </div>
          <div className="pf-video__right">
            <button className="pf-video__btn" onClick={cycleSpeed}>{speed}×</button>
            <button className="pf-video__btn" onClick={fs} aria-label="Fullscreen">⛶</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── Tabs ─────────
function Tabs({ tabs, active, onChange, variant = "minimal" }) {
  return (
    <nav className={`pf-tabs pf-tabs--${variant}`} role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={`pf-tab ${active === t.id ? "is-active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          <span className="pf-tab__num">{t.num}</span>
          <span className="pf-tab__label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ───────── Work entry body ─────────
function WorkBody({ item }) {
  return (
    <>
      <ul className="pf-bullets">
        {item.bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
      <Stack items={item.stack} />
      {item.images && (
        <div className="pf-entry__media">
          <Carousel images={item.images} />
        </div>
      )}
    </>
  );
}

// ───────── Project entry body ─────────
function ProjectBody({ item }) {
  return (
    <>
      <p className="pf-entry__blurb">{item.blurb}</p>
      {item.bullets && (
        <>
          <p className="pf-entry__label">Highlights</p>
          <ul className="pf-bullets">
            {item.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </>
      )}
      <Stack items={item.stack} />
      {item.video && (
        <div className="pf-entry__media">
          <VideoPlayer src={item.video} />
        </div>
      )}
      {item.images && (
        <div className="pf-entry__media">
          <Carousel images={item.images} />
        </div>
      )}
      {item.note && <p className="pf-entry__note">{item.note}</p>}
      {item.links && (
        <div className="pf-entry__links">
          {item.links.map((l, i) => (
            <a key={i} href={l.href} target="_blank" rel="noopener noreferrer" className="pf-link">
              {l.label} <span className="pf-link__arrow">↗</span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}

// ───────── Music block ─────────
function MusicBlock({ data }) {
  return (
    <div className="pf-music">
      <p className="pf-music__intro">{data.intro}</p>
      <ul className="pf-tracklist">
        {data.tracks.map((t, i) => (
          <li key={i} className="pf-tracklist__row">
            <span className="pf-tracklist__num">{(i + 1).toString().padStart(2, "0")}</span>
            <span className="pf-tracklist__title">{t.title}</span>
            <span className="pf-tracklist__kind">{t.kind}</span>
            <span className="pf-tracklist__year">{t.year}</span>
            <span className="pf-tracklist__dur">{t.duration}</span>
          </li>
        ))}
      </ul>
      <a href={data.soundcloud} target="_blank" rel="noopener noreferrer" className="pf-link pf-link--strong">
        Listen on SoundCloud <span className="pf-link__arrow">↗</span>
      </a>
    </div>
  );
}

// Export to global scope
Object.assign(window, {
  Entry, Stack, Carousel, VideoPlayer, Tabs, WorkBody, ProjectBody, MusicBlock,
});
