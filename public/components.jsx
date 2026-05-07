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

// ───────── Now-Playing Hero (music section) ─────────
function _seedRand(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
function NowPlayingWave({ seed, played = 0, bars = 120, peak = 28 }) {
  const data = useMemo(() => {
    const r = _seedRand(seed);
    return Array.from({ length: bars }, (_, i) => {
      const env = Math.sin((i / bars) * Math.PI) * 0.55 + 0.45;
      return Math.max(2, Math.round((r() * 0.75 + 0.25) * env * peak));
    });
  }, [seed, bars, peak]);
  return (
    <svg className="pf-mh__wave" viewBox={`0 0 ${bars * 4} ${peak * 2}`} preserveAspectRatio="none">
      {data.map((h, i) => {
        const isPlayed = i / bars < played;
        return (
          <rect key={i} x={i * 4} y={peak - h} width="2.4" height={h * 2} rx="1"
            fill={isPlayed ? "var(--accent)" : "var(--fg-soft)"} opacity={isPlayed ? 1 : 0.55} />
        );
      })}
    </svg>
  );
}
function _fmtTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

let _scWidgetPromise = null;
function ensureSCWidget() {
  if (window.SC?.Widget) return Promise.resolve(window.SC.Widget);
  if (_scWidgetPromise) return _scWidgetPromise;
  _scWidgetPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://w.soundcloud.com/player/api.js";
    s.async = true;
    s.onload = () => resolve(window.SC.Widget);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _scWidgetPromise;
}

function PlayingBars() {
  return (
    <span className="pf-mh__bars" aria-hidden="true">
      <span /><span /><span />
    </span>
  );
}

function NowPlayingHero({ data }) {
  const [tracks, setTracks] = useState(data.tracks);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState({ played: 0, cur: 0, dur: 0 });
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);

  // Hydrate titles + artwork from oEmbed in parallel.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      data.tracks.map((t) =>
        fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(t.url)}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return;
      setTracks(
        data.tracks.map((t, i) => {
          const o = results[i];
          if (!o) return t;
          // oEmbed returns "Title by Artist" — strip the suffix.
          const cleanTitle = (o.title || t.title).replace(/\s+by\s+.+$/i, "");
          return { ...t, title: cleanTitle, artwork: o.thumbnail_url || null };
        })
      );
    });
    return () => { cancelled = true; };
  }, [data]);

  // Initialize the widget once the iframe mounts.
  useEffect(() => {
    if (!iframeRef.current) return;
    let unbinds = [];
    ensureSCWidget().then((Widget) => {
      const w = Widget(iframeRef.current);
      widgetRef.current = w;
      const E = window.SC.Widget.Events;

      const onProgress = (e) => {
        setProgress((p) => ({
          ...p,
          played: e.relativePosition || 0,
          cur: (e.currentPosition || 0) / 1000,
        }));
        widgetRef.current?.getDuration((d) =>
          setProgress((p) => ({ ...p, dur: d / 1000 }))
        );
      };
      const onPlay = () => setPlaying(true);
      const onPause = () => setPlaying(false);
      const onFinish = () => setActive((i) => (i + 1) % tracks.length);

      w.bind(E.PLAY_PROGRESS, onProgress);
      w.bind(E.PLAY, onPlay);
      w.bind(E.PAUSE, onPause);
      w.bind(E.FINISH, onFinish);
      unbinds = [
        () => w.unbind(E.PLAY_PROGRESS),
        () => w.unbind(E.PLAY),
        () => w.unbind(E.PAUSE),
        () => w.unbind(E.FINISH),
      ];
    });
    return () => unbinds.forEach((fn) => fn());
  }, []);

  // Load the new track when the user changes it.
  useEffect(() => {
    const w = widgetRef.current;
    if (!w) return;
    const url = tracks[active]?.url;
    if (!url) return;
    w.load(url, {
      auto_play: playing,
      hide_related: true,
      show_comments: false,
      show_reposts: false,
      show_teaser: false,
      visual: false,
    });
    setProgress({ played: 0, cur: 0, dur: 0 });
  }, [active]);

  const togglePlay = () => {
    const w = widgetRef.current;
    if (!w) return;
    if (playing) w.pause();
    else w.play();
  };
  const prev = () => setActive((i) => (i - 1 + tracks.length) % tracks.length);
  const next = () => setActive((i) => (i + 1) % tracks.length);

  const t = tracks[active];

  return (
    <div className="pf-mh">
      <div className="pf-mh__stage">
        <div className="pf-mh__art" aria-hidden="true">
          {t.artwork ? (
            <img className="pf-mh__artImg" src={t.artwork} alt="" />
          ) : (
            <>
              <div className="pf-mh__artGrad" />
              <div className="pf-mh__artCrop" />
              <div className="pf-mh__artRect" />
              <div className="pf-mh__artRect2" />
            </>
          )}
          <div className="pf-mh__artNoise" />
          <div className="pf-mh__artScrim" />
          <div className="pf-mh__artLabel">
            {(t.title || "").toUpperCase()}
            <small>{String(active + 1).padStart(2, "0")}</small>
          </div>
        </div>
        <div className="pf-mh__info">
          <h3 className="pf-mh__title">{t.title}</h3>
          <p className="pf-mh__meta">{String(active + 1).padStart(2, "0")} / {String(tracks.length).padStart(2, "0")}</p>
          <NowPlayingWave seed={active * 47 + 13} played={progress.played} />
          <div className="pf-mh__time">
            {_fmtTime(progress.cur)} / {_fmtTime(progress.dur)}
          </div>
          <div className="pf-mh__trans">
            <button className="pf-mh__transSm" onClick={prev} aria-label="Previous track">‹‹</button>
            <button className="pf-mh__transMain" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
              {playing ? "❚❚" : "▶"}
            </button>
            <button className="pf-mh__transSm" onClick={next} aria-label="Next track">››</button>
          </div>
          <a href={t.url} target="_blank" rel="noopener noreferrer" className="pf-mh__cta">
            View on SoundCloud ↗
          </a>
        </div>
      </div>

      <div className="pf-mh__strip" role="tablist" aria-label="Track list">
        {tracks.map((tr, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === active}
            className={`pf-mh__cell ${i === active ? "is-active" : ""}`}
            onClick={() => { setActive(i); setPlaying(true); }}
          >
            <span className="pf-mh__cellNum">
              {playing && i === active
                ? <PlayingBars />
                : String(i + 1).padStart(2, "0")}
            </span>
            <span className="pf-mh__cellTitle">{tr.title}</span>
            <span className="pf-mh__cellChev" aria-hidden>›</span>
          </button>
        ))}
      </div>

      <div className="pf-mh__foot">
        <span>↳ Headphones recommended</span>
        <a
          href={data.soundcloud}
          target="_blank"
          rel="noopener noreferrer"
          className="pf-mh__footLink"
          aria-label="SoundCloud profile (opens in new tab)"
        >
          {window.PFIcons.SoundCloud({ width: 28, height: 22, className: "pf-mh__footSc" })}
          <span className="pf-link__arrow" aria-hidden="true">↗</span>
        </a>
      </div>

      <iframe
        ref={iframeRef}
        className="pf-mh__iframe"
        title="SoundCloud player"
        allow="autoplay"
        src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(tracks[0].url)}&visual=false&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false`}
      />
    </div>
  );
}

// Export to global scope
Object.assign(window, {
  Entry, Stack, Carousel, VideoPlayer, Tabs, WorkBody, ProjectBody, MusicBlock,
  NowPlayingHero,
});
