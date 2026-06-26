// Portfolio components — shared atoms used across all layouts
const { useState, useEffect, useRef, useMemo } = React;

// ───────── Accordion entry ─────────
function Entry({ id, header, meta, children, current, defaultOpen = false, density = "comfortable", summary, preview }) {
  const [open, setOpen] = useState(defaultOpen || !!current);
  const padY = density === "compact" ? "pf-py-3" : "pf-py-5";
  const panelId = `${id}-panel`;
  return (
    <div className={`pf-entry ${open ? "is-open" : ""} ${current ? "is-current" : ""}`} id={id}>
      <button
        className={`pf-entry__header ${padY}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
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
      {!open && preview ? (
        <p className="pf-entry__preview">{preview}</p>
      ) : null}
      <div
        id={panelId}
        className="pf-entry__body"
        hidden={!open}
        role="region"
        aria-label={summary ? `${summary} details` : undefined}
      >
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
          <button className="pf-carousel__btn" onClick={() => setI((i - 1 + n) % n)} aria-label={`Previous image (${i + 1} of ${n})`}>←</button>
          <span className="pf-carousel__counter" aria-live="polite">{i + 1} / {n}</span>
          <button className="pf-carousel__btn" onClick={() => setI((i + 1) % n)} aria-label={`Next image (${i + 1} of ${n})`}>→</button>
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
            <button className="pf-video__btn" onClick={cycleSpeed} aria-label={`Playback speed ${speed}x`}>{speed}×</button>
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

/** SoundCloud CDN artwork: prefer ~500px for the hero. */
function _scArtworkHiRes(url) {
  if (!url || typeof url !== "string") return null;
  return url.replace(/-large\.(jpg|jpeg|png|webp)/i, "-t500x500.$1");
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
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetError, setWidgetError] = useState(false);
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  // Pull title + artwork from the loaded widget (oEmbed often omits thumbnail_url for some tracks).
  function syncTrackFromWidget(indexWhenLoaded, urlWhenLoaded) {
    const w = widgetRef.current;
    if (!w) return;
    // Capture the sound the widget is currently showing — that's the OLD
    // track. We must not apply its metadata to the newly-active row.
    let priorSoundId = null;
    w.getCurrentSound((s) => {
      if (s) priorSoundId = s.id ?? s.permalink_url ?? null;
    });
    const apply = () => {
      w.getCurrentSound((sound) => {
        if (!sound) return;
        const soundId = sound.id ?? sound.permalink_url ?? null;
        if (priorSoundId !== null && soundId === priorSoundId) return;
        const rawArt = sound.artwork_url || sound.user?.avatar_url;
        const art = _scArtworkHiRes(rawArt);
        const scTitle =
          typeof sound.title === "string"
            ? sound.title.replace(/\s+by\s+.+$/i, "").trim()
            : "";
        setTracks((prev) => {
          if (indexWhenLoaded < 0 || indexWhenLoaded >= prev.length) return prev;
          const row = prev[indexWhenLoaded];
          if (row.url !== urlWhenLoaded) return prev;
          const next = { ...row };
          if (art) next.artwork = art;
          if (scTitle && !row.titleLocked) next.title = scTitle;
          if (next.artwork === row.artwork && next.title === row.title) return prev;
          return prev.map((t, i) => (i === indexWhenLoaded ? next : t));
        });
      });
    };
    apply();
    const t = setTimeout(apply, 450);
    const t2 = setTimeout(apply, 1400);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }

  // Hydrate titles + artwork from oEmbed; never drop artwork/title we already got from the widget.
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
      setTracks((prev) =>
        prev.map((t, i) => {
          const o = results[i];
          if (!o) return t;
          const cleanTitle = t.titleLocked
            ? t.title
            : (o.title || t.title).replace(/\s+by\s+.+$/i, "").trim();
          const artwork = o.thumbnail_url || t.artwork || null;
          return { ...t, title: cleanTitle, artwork };
        })
      );
    });
    return () => { cancelled = true; };
  }, [data]);

  // Warm the browser image cache so track switches paint artwork instantly.
  useEffect(() => {
    tracks.forEach((tr) => {
      if (!tr.artwork) return;
      const img = new Image();
      img.src = tr.artwork;
    });
  }, [tracks]);

  // Initialize the widget once the iframe mounts.
  useEffect(() => {
    if (!iframeRef.current) return;
    const unbindsRef = { current: [] };
    let cancelled = false;
    ensureSCWidget().then((Widget) => {
      if (cancelled || !iframeRef.current) return;
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
      const onFinish = () =>
        setActive((i) => (i + 1) % Math.max(1, tracksRef.current.length));
      const onError = () => setWidgetError(true);

      w.bind(E.PLAY_PROGRESS, onProgress);
      w.bind(E.PLAY, onPlay);
      w.bind(E.PAUSE, onPause);
      w.bind(E.FINISH, onFinish);
      w.bind(E.ERROR, onError);
      unbindsRef.current = [
        () => w.unbind(E.PLAY_PROGRESS),
        () => w.unbind(E.PLAY),
        () => w.unbind(E.PAUSE),
        () => w.unbind(E.FINISH),
        () => w.unbind(E.ERROR),
      ];
      setWidgetReady(true);
      setWidgetError(false);
    }).catch(() => {
      if (!cancelled) setWidgetError(true);
    });
    return () => {
      cancelled = true;
      unbindsRef.current.forEach((fn) => fn());
      unbindsRef.current = [];
      setWidgetReady(false);
    };
  }, []);

  // Load the current track after the widget API is ready.
  // Do not depend on `tracks`: oEmbed/widget metadata updates must not call load() again.
  useEffect(() => {
    if (!widgetReady) return;
    const w = widgetRef.current;
    if (!w) return;
    const row = tracksRef.current[active];
    const url = row?.url;
    if (!url) return;
    const idx = active;
    w.load(url, {
      auto_play: playing,
      hide_related: true,
      show_comments: false,
      show_reposts: false,
      show_teaser: false,
      visual: false,
    });
    setProgress({ played: 0, cur: 0, dur: 0 });
    return syncTrackFromWidget(idx, url);
  }, [active, widgetReady]);

  const togglePlay = () => {
    const w = widgetRef.current;
    const row = tracksRef.current[active];
    if (!w) {
      if (row?.url) window.open(row.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (playing) w.pause();
    else w.play();
  };
  const prev = () => setActive((i) => (i - 1 + tracks.length) % tracks.length);
  const next = () => setActive((i) => (i + 1) % tracks.length);

  const t = tracks[active];
  const trackLabel = t.title && t.title !== "—" ? t.title : `Track ${active + 1}`;

  return (
    <div className="pf-mh">
      {widgetError ? (
        <p className="pf-mh__status" role="status">
          The embedded player did not load. Use the SoundCloud links below to listen.
        </p>
      ) : null}
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
            {t.title || ""}
          </div>
        </div>
        <div className="pf-mh__info">
          <h3 className="pf-mh__title">{t.title}</h3>
          <NowPlayingWave seed={active * 47 + 13} played={progress.played} />
          <div className="pf-mh__time" aria-live="off">
            <span className="pf-sr-only">Playback time </span>
            {_fmtTime(progress.cur)} / {_fmtTime(progress.dur)}
          </div>
          <div className="pf-mh__trans">
            <button className="pf-mh__transSm" onClick={prev} aria-label="Previous track">‹‹</button>
            <button
              className="pf-mh__transMain"
              onClick={togglePlay}
              aria-label={playing ? `Pause ${trackLabel}` : `Play ${trackLabel}`}
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <button className="pf-mh__transSm" onClick={next} aria-label="Next track">››</button>
          </div>
          <a href={t.url} target="_blank" rel="noopener noreferrer" className="pf-mh__cta">
            View {trackLabel} on SoundCloud ↗
          </a>
        </div>
      </div>

      <div className="pf-mh__strip" role="tablist" aria-label="Track list" style={{ "--pf-strip-cols": tracks.length }}>
        {tracks.map((tr, i) => {
          const cellLabel = tr.title && tr.title !== "—" ? tr.title : `Track ${i + 1}`;
          return (
          <button
            key={i}
            role="tab"
            aria-selected={i === active}
            aria-label={`${cellLabel}${i === active && playing ? ", playing" : ""}`}
            className={`pf-mh__cell ${i === active ? "is-active" : ""}`}
            onClick={() => { setActive(i); setPlaying(true); }}
          >
            {playing && i === active ? (
              <span className="pf-mh__cellPlay" aria-hidden="true"><PlayingBars /></span>
            ) : null}
            <span className="pf-mh__cellTitle">{tr.title}</span>
            <span className="pf-mh__cellChev" aria-hidden>›</span>
          </button>
          );
        })}
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
