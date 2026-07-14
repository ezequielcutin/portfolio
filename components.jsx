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
          <div className="pf-video__progressFill" style={{ transform: `scaleX(${progress / 100})` }} />
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

// ───────── Projects terminal (~/projects explorer) ─────────
function _projYear(d) { const m = /(\d{4})/.exec(d || ""); return m ? m[1] : ""; }

function ProjectsTerminal({ items }) {
  const [openId, setOpenId] = useState(items[0] && items[0].id);
  const [cmd, setCmd] = useState("");
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(false);
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [hint, setHint] = useState(false);
  // Mobile single-pane: "list" shows ls output, "reading" shows the README.
  // Desktop ignores this (CSS only applies it under 760px).
  const [mobileView, setMobileView] = useState("list");
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const paneRef = useRef(null);
  const mountedRef = useRef(false);
  const open = items.find((p) => p.id === openId) || items[0];

  // On project switch, return the reading pane to the top. On desktop keep the
  // active row in view; on mobile bring the reading pane into view (it sits
  // below the file list, so a tap lower in the list would otherwise be silent).
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (paneRef.current) {
      paneRef.current.scrollTop = 0;
      if (paneRef.current.parentElement) paneRef.current.parentElement.scrollTop = 0;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    if (mobile) {
      // Single-pane: the README replaces the list in place; just make sure the
      // terminal frame's top (with the cd .. row) is on screen.
      if (rootRef.current) {
        const top = rootRef.current.getBoundingClientRect().top;
        if (top < 0) rootRef.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
    } else {
      const row = listRef.current && listRef.current.querySelector(".pf-term__item.is-open");
      if (row && row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
    }
  }, [openId]);

  // First time the terminal scrolls into view this session, briefly draw the
  // eye to the command line so the prompt reads as typeable, not decorative.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    try { if (sessionStorage.getItem("pf-term-hinted") === "1") return; } catch (e) {}
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) {
        setHint(true);
        try { sessionStorage.setItem("pf-term-hinted", "1"); } catch (e) {}
        io.disconnect();
        setTimeout(() => setHint(false), 2600);
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onInputKeyDown = (e) => {
    if (e.key === "Tab") {
      const parts = cmd.trim().split(/\s+/);
      const partial = (parts.length === 2 ? parts[1] : parts[0] || "").toLowerCase();
      const m = partial && items.find((p) => p.id.startsWith(partial));
      if (m) { e.preventDefault(); setCmd(parts.length === 2 ? `${parts[0]} ${m.id} ` : `${m.id}`); }
      return;
    }
    if (e.key === "ArrowUp" && history.length) {
      e.preventDefault();
      const ni = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(ni); setCmd(history[ni]);
    } else if (e.key === "ArrowDown" && histIdx >= 0) {
      e.preventDefault();
      const ni = histIdx + 1;
      if (ni >= history.length) { setHistIdx(-1); setCmd(""); }
      else { setHistIdx(ni); setCmd(history[ni]); }
    }
  };

  const runCmd = (raw) => {
    const line = (raw || "").trim();
    if (!line) return;
    setHistory((h) => (h[h.length - 1] === line ? h : [...h, line]));
    setHistIdx(-1);
    const parts = line.split(/\s+/);
    const verb = parts[0].toLowerCase();
    const arg = parts.slice(1).join(" ").replace(/\/+$/, "").toLowerCase();
    const find = (n) => n && (
      items.find((p) => p.id === n) ||
      items.find((p) => p.id.startsWith(n)) ||
      items.find((p) => p.id.includes(n))
    );
    const OPENERS = ["open", "cat", "cd", "less", "vim", "nano", "code"];

    if (verb === "ls") { setErr(false); setMsg(items.map((p) => p.id + "/").join("  ")); return; }
    if (verb === "help") { setErr(false); setMsg("commands: open <name> · cat <name> · ls · clear"); return; }
    if (verb === "clear") { setErr(false); setMsg(null); setCmd(""); return; }
    if (verb === "cd" && (arg === ".." || arg === "")) { setErr(false); setMsg(null); setCmd(""); setMobileView("list"); return; }

    // "open gobank", "cat frac", or a bare project name like "gobank"
    const target = OPENERS.includes(verb) ? find(arg) : find(verb);
    if (target) { setOpenId(target.id); setCmd(""); setErr(false); setMsg(null); setMobileView("reading"); return; }

    setErr(true);
    setMsg(OPENERS.includes(verb) ? `no such project: ${arg || "?"}` : `command not found: ${verb}`);
  };

  const focusRow = (idx) => {
    const rows = listRef.current && listRef.current.querySelectorAll(".pf-term__item");
    if (rows && rows[idx]) rows[idx].focus();
  };
  const onKeyDown = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const cur = items.findIndex((p) => p.id === (e.target.dataset ? e.target.dataset.id : openId));
    const i = cur < 0 ? 0 : cur;
    if (e.key === "ArrowDown") focusRow(Math.min(items.length - 1, i + 1));
    else if (e.key === "ArrowUp") focusRow(Math.max(0, i - 1));
    else if (e.key === "Home") focusRow(0);
    else if (e.key === "End") focusRow(items.length - 1);
  };

  return (
    <div className={`pf-term ${hint ? "is-hinting" : ""} ${mobileView === "reading" ? "is-reading" : ""}`} ref={rootRef} role="group" aria-label="Projects explorer">
      <div className="pf-term__bar">
        <span className="pf-term__dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="pf-term__path">ezecutin@portfolio: ~/projects</span>
        <span className="pf-term__hint" aria-hidden="true">type a command · ↑↓ browse</span>
      </div>

      <div className="pf-term__body">
        <div className="pf-term__list" ref={listRef} onKeyDown={onKeyDown}>
          <p className="pf-term__ls" aria-hidden="true"><span className="pf-term__pfx">$</span> ls projects/</p>
          {items.map((p) => (
            <button
              key={p.id}
              data-id={p.id}
              type="button"
              aria-current={p.id === openId ? "true" : undefined}
              className={`pf-term__item ${p.id === openId ? "is-open" : ""}`}
              onClick={() => { setOpenId(p.id); setMobileView("reading"); }}
              onFocus={() => setOpenId(p.id)}
            >
              <span className="pf-term__caret" aria-hidden="true">▸</span>
              <span className="pf-term__name">{p.id}/</span>
              <span className="pf-term__year">{_projYear(p.date)}</span>
              <span className="pf-term__cmt">{p.tagline}</span>
            </button>
          ))}
        </div>

        <div className="pf-term__pane" key={open.id} ref={paneRef}>
          <button
            type="button"
            className="pf-term__back"
            onClick={() => setMobileView("list")}
            aria-label="Back to project list"
          >
            <span className="pf-term__pfx" aria-hidden="true">$</span> cd ..
          </button>
          <p className="pf-term__cmd"><span className="pf-term__pfx">$</span> cat {open.id}/README.md</p>
          <h3 className="pf-term__title">{open.title}</h3>
          <p className="pf-term__blurb">{open.blurb}</p>

          {open.bullets && (
            <>
              <p className="pf-term__sec"><span className="pf-term__hash" aria-hidden="true">##</span> highlights</p>
              <ul className="pf-term__bullets">
                {open.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </>
          )}

          {open.stack && (
            <>
              <p className="pf-term__sec"><span className="pf-term__hash" aria-hidden="true">##</span> stack</p>
              <Stack items={open.stack} />
            </>
          )}

          {(open.video || open.images) && (
            <>
              <p className="pf-term__sec"><span className="pf-term__hash" aria-hidden="true">##</span> preview</p>
              {open.video && <div className="pf-term__media"><VideoPlayer src={open.video} /></div>}
              {open.images && <div className="pf-term__media"><Carousel images={open.images} /></div>}
            </>
          )}

          {open.note && <p className="pf-term__note"># {open.note}</p>}

          {open.links && (
            <div className="pf-term__links">
              {open.links.map((l, i) => {
                const isGH = /github\.com/i.test(l.href) || /github/i.test(l.label);
                const GH = window.PFIcons && window.PFIcons.GitHub;
                return (
                  <a key={i} href={l.href} target="_blank" rel="noopener noreferrer" className="pf-term__link">
                    {isGH && GH && <GH className="pf-term__link__icon" />}
                    <span>{l.label}</span>
                    <span className="pf-term__link__arrow" aria-hidden="true">↗</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <form className="pf-term__prompt" onSubmit={(e) => { e.preventDefault(); runCmd(cmd); }}>
        <label className="pf-term__pfx" htmlFor="pf-term-input">$</label>
        <input
          id="pf-term-input"
          className="pf-term__input"
          type="text"
          value={cmd}
          onChange={(e) => { setCmd(e.target.value); setHistIdx(-1); if (msg) { setMsg(null); setErr(false); } }}
          onKeyDown={onInputKeyDown}
          placeholder={`open ${open ? open.id : "project"}`}
          aria-label="Run a command, for example: open gobank. Tab completes, up arrow recalls history."
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        {msg && (
          <span className={`pf-term__msg ${err ? "is-err" : ""}`} role="status" aria-live="polite">{msg}</span>
        )}
      </form>
    </div>
  );
}

// ───────── Work timeline (pinned horizontal scroll) ─────────
const _MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
function _startSort(dateStr) {
  const m = /([A-Za-z]{3})[A-Za-z]*\s+(\d{4})/.exec(dateStr || "");
  if (!m) return 0;
  return parseInt(m[2], 10) * 12 + (_MONTHS[m[1].toLowerCase()] ?? 0);
}
/** Start year of a role, e.g. "Jan 2025 to Present" -> "2025". Position on the
 *  timeline is start-based; "current" is signalled by the accent dot, not the label. */
function _railLabel(dateStr) {
  const m = /(\d{4})/.exec(dateStr || "");
  return m ? m[1] : "";
}
/** Monogram shown until a real logo SVG is dropped into /logos. */
function _initials(org) {
  const skip = new Set(["of", "the", "and", "for", "at"]);
  const words = (org || "").split(/\s+/).filter((w) => w && !skip.has(w.toLowerCase()));
  if (words.length === 1) {
    const w = words[0];
    return (w.length <= 3 ? w : w.slice(0, 2)).toUpperCase();
  }
  return words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

/** Mobile deck card: a concise timeline preview that opens a focused dossier. */
function WorkDeckCard({ w, i, n, active, onOpen }) {
  const detailsId = `tl-dossier-${w.id}`;
  return (
    <article
      role="listitem"
      id={`tl-panel-${w.id}`}
      className={`pf-tl__panel ${w.current ? "is-current" : ""} ${active ? "is-active" : ""}`}
      aria-current={w.current ? "true" : undefined}
    >
      <div className="pf-tl__panelTop">
        <span className={`pf-tl__logo ${w.logoBleed ? "is-bleed" : ""}`}>
          <span className="pf-tl__logoFallback" aria-hidden="true">{_initials(w.org)}</span>
          <img
            className="pf-tl__logoImg"
            src={w.logo || `logos/${w.id}.svg`}
            alt={`${w.org} logo`}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </span>
        <div className="pf-tl__topRight">
          <span className="pf-tl__index">{String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
          {w.current ? (
            <span className="pf-tl__nowTag">
              <span className="pf-live" aria-hidden="true"><span className="pf-live__core" /></span>
              current
            </span>
          ) : null}
        </div>
      </div>
      <div className="pf-tl__year">{_railLabel(w.date)}</div>
      <h3 className="pf-tl__role">{w.title}</h3>
      <div className="pf-tl__org">{w.org}</div>
      <div className="pf-tl__meta">{w.date} · {w.location}</div>
      <p className="pf-tl__cardPreview">{w.bullets[0]}</p>
      <button
        type="button"
        className="pf-tl__cardMore"
        aria-haspopup="dialog"
        aria-controls={detailsId}
        onClick={(event) => onOpen(w, event.currentTarget)}
      >
        <span>View details</span>
        <span className="pf-tl__cardMoreArrow" aria-hidden="true">↗</span>
      </button>
    </article>
  );
}

function WorkDossier({ w, i, n, direction, opener, onClose, onNavigate }) {
  const dialogRef = useRef(null);
  const titleId = `tl-dossier-title-${w.id}`;

  useEffect(() => {
    const body = document.body;
    const appRoot = document.getElementById("root");
    const scrollY = window.scrollY;
    const rootWasInert = appRoot?.inert;
    const rootAriaHidden = appRoot?.getAttribute("aria-hidden");
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    if (appRoot) {
      appRoot.inert = true;
      appRoot.setAttribute("aria-hidden", "true");
    }
    dialogRef.current?.querySelector("button")?.focus({ preventScroll: true });

    return () => {
      if (appRoot) {
        appRoot.inert = !!rootWasInert;
        if (rootAriaHidden === null) appRoot.removeAttribute("aria-hidden");
        else appRoot.setAttribute("aria-hidden", rootAriaHidden);
      }
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      const focusTarget = opener?.isConnected
        ? opener
        : document.querySelector("#block-work");
      focusTarget?.focus?.({ preventScroll: true });
      window.scrollTo(0, scrollY);
    };
  }, [opener]);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      ) || []
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return ReactDOM.createPortal(
    <div
      className="pf-tl__dossierBackdrop"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <article
        id={`tl-dossier-${w.id}`}
        ref={dialogRef}
        className={`pf-tl__dossier ${w.current ? "is-current" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        <header className="pf-tl__dossierBar">
          <button type="button" className="pf-tl__dossierClose" onClick={onClose}>
            <span aria-hidden="true">←</span>
            Timeline
          </button>
          <span className="pf-tl__dossierCounter" aria-live="polite" aria-atomic="true">
            <span className="pf-sr-only">{w.title} at {w.org}, </span>
            {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </span>
          <nav className="pf-tl__dossierNav" aria-label="Browse work experiences">
            <button
              type="button"
              onClick={() => onNavigate(-1)}
              aria-disabled={i === 0 ? "true" : undefined}
              aria-label="Previous work experience"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => onNavigate(1)}
              aria-disabled={i === n - 1 ? "true" : undefined}
              aria-label="Next work experience"
            >
              →
            </button>
          </nav>
        </header>

        <div
          key={w.id}
          className={`pf-tl__dossierContent is-${direction < 0 ? "previous" : "next"}`}
        >
        <div className="pf-tl__dossierBody">
          <div className="pf-tl__dossierTop">
            <span className={`pf-tl__logo ${w.logoBleed ? "is-bleed" : ""}`}>
              <span className="pf-tl__logoFallback" aria-hidden="true">{_initials(w.org)}</span>
              <img
                className="pf-tl__logoImg"
                src={w.logo || `logos/${w.id}.svg`}
                alt={`${w.org} logo`}
                onError={(event) => { event.currentTarget.style.display = "none"; }}
              />
            </span>
            <div className="pf-tl__dossierStatus">
              {w.current ? (
                <span className="pf-tl__nowTag">
                  <span className="pf-live" aria-hidden="true"><span className="pf-live__core" /></span>
                  current
                </span>
              ) : null}
            </div>
            <div className="pf-tl__dossierYear" aria-hidden="true">{_railLabel(w.date)}</div>
          </div>

          <h3 className="pf-tl__dossierTitle" id={titleId}>{w.title}</h3>
          <p className="pf-tl__dossierOrg">{w.org}</p>

          <dl className="pf-tl__dossierMeta">
            <div><dt>Period</dt><dd>{w.date}</dd></div>
            <div><dt>Location</dt><dd>{w.location}</dd></div>
          </dl>

          <section className="pf-tl__dossierSection" aria-labelledby={`${titleId}-impact`}>
            <h4 id={`${titleId}-impact`}><span>01</span> Highlights</h4>
            <ol className="pf-tl__dossierBullets">
              {w.bullets.map((bullet, bulletIndex) => (
                <li key={bulletIndex}>
                  <span aria-hidden="true">{String(bulletIndex + 1).padStart(2, "0")}</span>
                  <p>{bullet}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="pf-tl__dossierSection" aria-labelledby={`${titleId}-tools`}>
            <h4 id={`${titleId}-tools`}><span>02</span> Systems used</h4>
            <Stack items={w.stack} />
          </section>
        </div>

        <footer className="pf-tl__dossierFooter">
          <span aria-hidden="true">END / {w.id.toUpperCase()}</span>
          <button type="button" onClick={onClose}>Return to timeline</button>
        </footer>
        </div>
      </article>
    </div>,
    document.body
  );
}

function WorkTimeline({ items }) {
  const ordered = items;
  const n = ordered.length;

  // Three modes: "pinned" desktop scroll-jack, "deck" mobile swipe rail,
  // "stacked" fallback (wide viewport but coarse pointer / reduced motion).
  const [mode, setMode] = useState("stacked");
  const pinned = mode === "pinned";
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dossierId, setDossierId] = useState(null);
  const [dossierDirection, setDossierDirection] = useState(1);
  const sectionRef = useRef(null);
  const stickyRef = useRef(null);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const maxXRef = useRef(0);
  const deckRef = useRef(null);
  const dossierOpenerRef = useRef(null);

  useEffect(() => {
    const pinnedMq = window.matchMedia(
      "(min-width: 901px) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    );
    const deckMq = window.matchMedia("(max-width: 900px)");
    const apply = () =>
      setMode(pinnedMq.matches ? "pinned" : deckMq.matches ? "deck" : "stacked");
    apply();
    pinnedMq.addEventListener("change", apply);
    deckMq.addEventListener("change", apply);
    return () => {
      pinnedMq.removeEventListener("change", apply);
      deckMq.removeEventListener("change", apply);
    };
  }, []);

  useEffect(() => {
    if (mode !== "deck") setDossierId(null);
  }, [mode]);

  // Pinned scroll-jack: translate the track from NATIVE scroll position.
  // We never capture the wheel, so keyboard / trackpad / scrollbar all keep working.
  useEffect(() => {
    if (!pinned) return;
    const section = sectionRef.current;
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!section || !track || !viewport) return;

    let raf = 0;
    const measure = () => {
      maxXRef.current = Math.max(0, track.scrollWidth - viewport.clientWidth);
    };
    const render = () => {
      raf = 0;
      const vh = window.innerHeight;
      const top = section.offsetTop;
      const dist = section.offsetHeight - vh; // scrollable budget while pinned
      const p = dist > 0 ? Math.min(1, Math.max(0, (window.scrollY - top) / dist)) : 0;
      const x = -p * maxXRef.current;
      track.style.transform = `translate3d(${x}px,0,0)`;
      setProgress(p);
      setActive(Math.round(p * (n - 1)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(render); };

    measure();
    render();
    window.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => { measure(); render(); });
    ro.observe(track);
    ro.observe(viewport);
    return () => {
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      track.style.transform = "";
    };
  }, [pinned, n]);

  // Deck mode: track which card is snapped so the progress line + counter follow.
  useEffect(() => {
    if (mode !== "deck") return;
    const rail = deckRef.current;
    if (!rail || typeof IntersectionObserver === "undefined") return;
    const cards = Array.from(rail.querySelectorAll(".pf-tl__panel"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const idx = cards.indexOf(en.target);
          if (idx >= 0) setActive(idx);
        });
      },
      { root: rail, threshold: 0.6 }
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [mode, n]);

  // Jump to a panel by scrolling the page (pinned) — keeps native scroll authoritative.
  const jumpTo = (i) => {
    const section = sectionRef.current;
    if (!section) return;
    if (pinned && n > 1) {
      const dist = section.offsetHeight - window.innerHeight;
      const top = section.offsetTop + (i / (n - 1)) * dist;
      window.scrollTo({ top, behavior: "smooth" });
    } else {
      document
        .getElementById(`tl-panel-${ordered[i].id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const Panels = ordered.map((w, i) => (
    <article
      key={w.id}
      id={`tl-panel-${w.id}`}
      className={`pf-tl__panel ${w.current ? "is-current" : ""} ${pinned && i === active ? "is-active" : ""}`}
      aria-current={w.current ? "true" : undefined}
    >
      <div className="pf-tl__panelTop">
        <span className={`pf-tl__logo ${w.logoBleed ? "is-bleed" : ""}`}>
          <span className="pf-tl__logoFallback" aria-hidden="true">{_initials(w.org)}</span>
          <img
            className="pf-tl__logoImg"
            src={w.logo || `logos/${w.id}.svg`}
            alt={`${w.org} logo`}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </span>
        <div className="pf-tl__topRight">
          <span className="pf-tl__index">{String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
          {w.current ? (
            <span className="pf-tl__nowTag">
              <span className="pf-live" aria-hidden="true"><span className="pf-live__core" /></span>
              current
            </span>
          ) : null}
        </div>
      </div>
      <div className="pf-tl__year">{_railLabel(w.date)}</div>
      <h3 className="pf-tl__role">{w.title}</h3>
      <div className="pf-tl__org">{w.org}</div>
      <div className="pf-tl__meta">{w.date} · {w.location}</div>
      <ul className="pf-tl__bullets">
        {w.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
      </ul>
      <Stack items={w.stack} />
    </article>
  ));

  if (mode === "deck") {
    const dossierIndex = ordered.findIndex((work) => work.id === dossierId);
    const dossier = dossierIndex >= 0 ? ordered[dossierIndex] : null;
    return (
      <div className="pf-tl pf-tl--deck">
        <div
          className="pf-tl__deckRail"
          ref={deckRef}
          role="list"
          aria-label="Work timeline, swipe horizontally"
        >
          {ordered.map((w, i) => (
            <WorkDeckCard
              key={w.id}
              w={w}
              i={i}
              n={n}
              active={i === active}
              onOpen={(work, opener) => {
                dossierOpenerRef.current = opener;
                setDossierDirection(1);
                setDossierId(work.id);
              }}
            />
          ))}
        </div>
        <div className="pf-tl__deckMeta">
          <div className="pf-tl__railLine" aria-hidden="true">
            <div
              className="pf-tl__railFill"
              style={{ transform: `scaleX(${n > 1 ? active / (n - 1) : 1})` }}
            />
          </div>
          <div className="pf-tl__deckYears">
            <span aria-hidden="true">{_railLabel(ordered[0].date)}</span>
            <span className="pf-tl__deckNow" aria-live="polite">
              {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
            <span aria-hidden="true">{_railLabel(ordered[n - 1].date)}</span>
          </div>
        </div>
        {dossier ? (
          <WorkDossier
            w={dossier}
            i={dossierIndex}
            n={n}
            direction={dossierDirection}
            opener={dossierOpenerRef.current}
            onClose={() => setDossierId(null)}
            onNavigate={(step) => {
              const nextIndex = Math.min(n - 1, Math.max(0, dossierIndex + step));
              if (nextIndex === dossierIndex) return;
              const dialog = document.querySelector(".pf-tl__dossier");
              if (dialog) dialog.scrollTop = 0;
              setDossierDirection(step);
              setDossierId(ordered[nextIndex].id);
            }}
          />
        ) : null}
      </div>
    );
  }

  if (!pinned) {
    return (
      <div className="pf-tl pf-tl--stacked">
        <div className="pf-tl__panels">{Panels}</div>
      </div>
    );
  }

  return (
    <div
      className="pf-tl pf-tl--pinned"
      ref={sectionRef}
      style={{ "--pf-tl-panels": n }}
    >
      <div className="pf-tl__sticky" ref={stickyRef}>
        <div className="pf-tl__viewport" ref={viewportRef}>
          <div className="pf-tl__track" ref={trackRef}>
            {Panels}
          </div>
        </div>
        <div className="pf-tl__rail" role="presentation">
          <div className="pf-tl__railLine">
            <div className="pf-tl__railFill" style={{ transform: `scaleX(${progress})` }} />
          </div>
          <div className="pf-tl__railTicks">
            {ordered.map((w, i) => (
              <button
                key={w.id}
                type="button"
                className={`pf-tl__tick ${i === active ? "is-active" : ""} ${w.current ? "is-current" : ""}`}
                onClick={() => jumpTo(i)}
                aria-label={`${w.title} at ${w.org}, ${w.date}`}
              >
                <span className="pf-tl__tickDot" aria-hidden="true" />
                <span className="pf-tl__tickYear">{_railLabel(w.date)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={`pf-tl__hint ${progress > 0.015 ? "is-hidden" : ""}`} aria-hidden="true">
          scroll to walk the timeline <span className="pf-tl__hintArrow">→</span>
        </div>
      </div>
    </div>
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
  const heroRef = useRef(null);
  const [heroInView, setHeroInView] = useState(true);
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

  // Mini-player: know when the music hero has scrolled off screen.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => setHeroInView(en.isIntersecting)),
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
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
    <div className="pf-mh" ref={heroRef}>
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

      {playing && !heroInView ? (
        <div className="pf-mini" role="group" aria-label="Now playing">
          <PlayingBars />
          <button
            type="button"
            className="pf-mini__title"
            onClick={() => {
              const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              document.getElementById("block-music")?.scrollIntoView({
                behavior: reduce ? "auto" : "smooth",
                block: "start",
              });
            }}
            aria-label={`Now playing ${trackLabel}. Jump to player`}
          >
            {trackLabel}
          </button>
          <button
            type="button"
            className="pf-mini__toggle"
            onClick={togglePlay}
            aria-label={`Pause ${trackLabel}`}
          >
            ❚❚
          </button>
        </div>
      ) : null}
    </div>
  );
}

// Export to global scope
Object.assign(window, {
  Entry, Stack, Carousel, VideoPlayer, Tabs, WorkBody, ProjectBody, MusicBlock,
  NowPlayingHero, WorkTimeline, ProjectsTerminal,
});
