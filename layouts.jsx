// Three layout variations for the portfolio
const { useState: useStateL, useEffect: useEffectL } = React;

// ═════════ EDITORIAL — centered, type-led, monospace metadata ═════════
function LayoutEditorial({ data, tab, setTab, density }) {
  const tabs = [
  { id: "work", label: "Work" },
  { id: "projects", label: "Projects" },
  { id: "music", label: "Music" }];


  return (
    <div className="pf-shell pf-shell--editorial">
      <header className="pf-hero">
        <div className="pf-hero__topline">
          <span className="pf-mono pf-muted">EZ.C — Portfolio · 2026</span>
          <span className="pf-mono pf-muted">{data.identity.location}</span>
        </div>

        <div className="pf-hero__main">
          <img className="pf-hero__avatar" src={data.identity.headshot} alt={data.identity.name} />
          <div className="pf-hero__text">
            <h1 className="pf-hero__name">{data.identity.name}</h1>
            <p className="pf-hero__tagline">{data.identity.tagline}</p>
          </div>
        </div>

        <p className="pf-hero__bio">{data.identity.bio}</p>

        <div className="pf-hero__nowRow">
          <div className="pf-now">
            {data.now.map((n) =>
            <button
              key={n.entry}
              className="pf-now__pill"
              onClick={() => {setTab("work");setTimeout(() => {
                  const el = document.getElementById(`entry-${n.entry}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  el?.querySelector("button")?.click();
                }, 50);}}>
              
                <span className="pf-live"><span className="pf-live__core" /></span>
                <span>{n.role}</span>
                <span className="pf-now__sep">·</span>
                <span className="pf-muted">{n.at}</span>
              </button>
            )}
          </div>
        </div>

        <div className="pf-hero__links">
          {data.identity.links.map((l) => {
            const Icon = window.PFIcons[l.label];
            return (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="pf-hero__link">
                <span className="pf-hero__icon">{Icon ? <Icon /> : null}</span>
                <span className="pf-mono pf-muted">{l.label.toLowerCase()}</span>
                <span className="pf-hero__handle">{l.handle}</span>
              </a>
            );
          })}
        </div>
      </header>

      <Tabs tabs={tabs} active={tab} onChange={setTab} variant="editorial" />

      <main className="pf-main">
        {tab === "work" &&
        <section className="pf-section">
            <header className="pf-sectionHead">
              <h2 className="pf-sectionHead__title">Where I've been spending my hours.</h2>
            </header>
            <div className="pf-list">
              {data.work.map((w) =>
            <Entry
              key={w.id}
              id={`entry-${w.id}`}
              current={w.current}
              density={density}
              summary={`${w.title} at ${w.org}`}
              preview={w.bullets?.[0]}
              header={
              <>
                      <span className="pf-entry__role">{w.title}</span>
                      <span className="pf-entry__at"> at {w.org}</span>
                    </>
              }
              meta={`${w.date} · ${w.location}`}>
              
                  <WorkBody item={w} />
                </Entry>
            )}
            </div>
          </section>
        }

        {tab === "projects" &&
        <section className="pf-section">
            <header className="pf-sectionHead">
              <h2 className="pf-sectionHead__title">Builds, experiments, and side quests.</h2>
            </header>
            <div className="pf-list">
              {data.projects.map((p) =>
            <Entry
              key={p.id}
              id={`entry-${p.id}`}
              density={density}
              summary={`${p.title}, ${p.tagline}`}
              preview={p.bullets?.[0] ?? p.blurb}
              header={
              <>
                      <span className="pf-entry__role">{p.title}</span>
                      <span className="pf-entry__at"> — {p.tagline}</span>
                    </>
              }
              meta={p.date}>
              
                  <ProjectBody item={p} />
                </Entry>
            )}
            </div>
          </section>
        }

        {tab === "music" &&
        <section className="pf-section">
            <header className="pf-sectionHead">
              <h2 className="pf-sectionHead__title">Techno, house, and ambient.</h2>
            </header>
            <MusicBlock data={data.music} />
          </section>
        }
      </main>

      <footer className="pf-foot">
        <span className="pf-mono pf-muted">© {new Date().getFullYear()} {data.identity.name}</span>
        <span className="pf-mono pf-muted">Built quietly · Last updated Apr 2026</span>
      </footer>
    </div>);

}

// ═════════ INDEX — Swiss left rail, content right ═════════
function LayoutIndex({ data, tab, setTab, density }) {
  const tabs = [
  { id: "work", label: "Work" },
  { id: "projects", label: "Projects" },
  { id: "music", label: "Music" }];


  return (
    <div className="pf-shell pf-shell--index">
      <aside className="pf-rail">
        <div className="pf-rail__top">
          <div className="pf-rail__id">
            <img className="pf-rail__avatar" src={data.identity.headshot} alt={data.identity.name} />
            <div>
              <h1 className="pf-rail__name">{data.identity.name}</h1>
              <p className="pf-rail__role pf-mono">software engineer</p>
            </div>
          </div>
          <p className="pf-rail__bio">{data.identity.bioShort}</p>
        </div>

        <nav className="pf-rail__nav">
          {tabs.map((t) =>
          <button
            key={t.id}
            className={`pf-rail__navItem ${tab === t.id ? "is-active" : ""}`}
            onClick={() => setTab(t.id)}>
            
              <span className="pf-rail__navLabel">{t.label}</span>
              <span className="pf-rail__navCount pf-mono">
                {t.id === "work" ? data.work.length : t.id === "projects" ? data.projects.length : data.music.tracks.length}
              </span>
            </button>
          )}
        </nav>

        <div className="pf-rail__now">
          {data.now.map((n) =>
          <div key={n.entry} className="pf-rail__nowItem">
              <span className="pf-live"><span className="pf-live__core" /></span>
              <span>
                <span className="pf-rail__nowRole">{n.role}</span>
                <br />
                <span className="pf-muted pf-mono pf-tiny">{n.at}</span>
              </span>
            </div>
          )}
        </div>

        <div className="pf-rail__links">
          {data.identity.links.map((l) =>
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="pf-rail__link">
              <span className="pf-mono pf-muted">{l.label.toLowerCase()}</span>
              <span className="pf-rail__linkArrow">↗</span>
            </a>
          )}
        </div>

        <div className="pf-rail__foot">
          <span className="pf-mono pf-muted pf-tiny">© 2026 · {data.identity.location}</span>
        </div>
      </aside>

      <main className="pf-pane">
        {tab === "work" &&
        <section className="pf-section">
            <header className="pf-sectionHead pf-sectionHead--rail">
              <h2 className="pf-sectionHead__title">Seven roles, four cities.</h2>
            </header>
            <div className="pf-list">
              {data.work.map((w) =>
            <Entry
              key={w.id}
              id={`entry-${w.id}`}
              current={w.current}
              density={density}
              summary={`${w.title} at ${w.org}`}
              preview={w.bullets?.[0]}
              header={<><span className="pf-entry__role">{w.title}</span><span className="pf-entry__at"> at {w.org}</span></>}
              meta={`${w.date} · ${w.location}`}>
              
                  <WorkBody item={w} />
                </Entry>
            )}
            </div>
          </section>
        }
        {tab === "projects" &&
        <section className="pf-section">
            <header className="pf-sectionHead pf-sectionHead--rail">
              <h2 className="pf-sectionHead__title">Things I've shipped.</h2>
            </header>
            <div className="pf-list">
              {data.projects.map((p) =>
            <Entry
              key={p.id}
              id={`entry-${p.id}`}
              density={density}
              summary={`${p.title}, ${p.tagline}`}
              preview={p.bullets?.[0] ?? p.blurb}
              header={<><span className="pf-entry__role">{p.title}</span><span className="pf-entry__at"> — {p.tagline}</span></>}
              meta={p.date}>
              
                  <ProjectBody item={p} />
                </Entry>
            )}
            </div>
          </section>
        }
        {tab === "music" &&
        <section className="pf-section">
            <header className="pf-sectionHead pf-sectionHead--rail">
              <h2 className="pf-sectionHead__title">Late-night studio output.</h2>
            </header>
            <MusicBlock data={data.music} />
          </section>
        }
      </main>
    </div>);

}

// ═════════ STACKED — bold full-bleed sections, no tabs ═════════
const STACKED_SECTIONS = [
  { id: "block-work", label: "Work" },
  { id: "block-projects", label: "Projects" },
  { id: "block-music", label: "Music" },
];

function StickyNav() {
  const [activeId, setActiveId] = React.useState(null);
  const [scrolled, setScrolled] = React.useState(false);
  const navRef = React.useRef(null);
  const indicatorRef = React.useRef(null);

  React.useEffect(() => {
    const ids = STACKED_SECTIONS.map((s) => s.id);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));

    const onScroll = () => setScrolled(window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Position the sliding indicator under the active tab. Reads the live
  // .is-active element so it stays correct, and re-runs on resize / font load
  // (tab widths change between the desktop auto layout and the mobile thirds).
  const positionIndicator = React.useCallback(() => {
    const track = navRef.current?.querySelector(".pf-snav__track");
    const ind = indicatorRef.current;
    if (!track || !ind) return;
    const activeBtn = track.querySelector(".pf-snav__link.is-active");
    if (!activeBtn) { ind.style.opacity = "0"; return; }
    const trackRect = track.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    ind.style.width = `${btnRect.width}px`;
    ind.style.transform = `translateX(${btnRect.left - trackRect.left - 3}px)`;
    ind.style.opacity = "1";
  }, []);

  React.useLayoutEffect(() => { positionIndicator(); }, [activeId, positionIndicator]);

  React.useEffect(() => {
    const track = navRef.current?.querySelector(".pf-snav__track");
    if (!track) return;
    const ro = new ResizeObserver(() => positionIndicator());
    ro.observe(track);
    window.addEventListener("resize", positionIndicator, { passive: true });
    if (document.fonts?.ready) document.fonts.ready.then(positionIndicator);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", positionIndicator);
    };
  }, [positionIndicator]);

  const handleClick = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const navH = navRef.current?.offsetHeight || 56;
    const top = el.getBoundingClientRect().top + window.scrollY - navH - 8;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <nav
      ref={navRef}
      className={`pf-snav ${scrolled ? "is-scrolled" : ""}`}
      aria-label="Page sections"
    >
      <div className="pf-snav__track">
        <div ref={indicatorRef} className="pf-snav__indicator" />
        {STACKED_SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            data-section={s.id}
            className={`pf-snav__link ${activeId === s.id ? "is-active" : ""}`}
            onClick={(e) => handleClick(e, s.id)}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function LayoutStacked({ data, density }) {
  const emailLink = data.identity.links.find((l) => l.label === "Email");
  const socialLinks = data.identity.links.filter((l) => l.label !== "Email");
  const EmailIcon = window.PFIcons?.Email;

  return (
    <div className="pf-shell pf-shell--stacked">
      <section className="pf-block pf-block--hero">
        <canvas id="header-ambience" className="pf-header-ambience" aria-hidden="true"></canvas>
        <div className="pf-block__inner">
          <h1 className="pf-stacked__name" aria-label={data.identity.name}>
            <span aria-hidden="true">
            {(() => {
              const words = data.identity.name.trim().split(/\s+/);
              let delayIdx = 0;
              return words.map((word, wi) => (
                <React.Fragment key={wi}>
                  {wi > 0 ? " " : null}
                  <span className="pf-stacked__word">
                    {word.split("").map((ch, i) => {
                      const d = delayIdx++;
                      return (
                        <span
                          key={i}
                          className="pf-stacked__char"
                          style={{ animationDelay: `${d * 65}ms` }}
                        >
                          {ch}
                        </span>
                      );
                    })}
                    {wi === words.length - 1 ? (
                      <span
                        className="pf-stacked__period pf-stacked__char"
                        style={{ animationDelay: `${delayIdx * 65}ms` }}
                      >
                        .
                      </span>
                    ) : null}
                  </span>
                </React.Fragment>
              ));
            })()}
            </span>
          </h1>
          <p className="pf-stacked__tagline">{data.identity.tagline}</p>
          <div className="pf-stacked__heroGrid">
            <div className="pf-stacked__photoFrame">
              <img className="pf-stacked__photo" src={data.identity.headshot} alt={data.identity.name} />
            </div>
            <div className="pf-stacked__heroText">
              <p className="pf-stacked__bio">{data.identity.bio}</p>
              <div className="pf-stacked__now">
                {data.now.map((n) => (
                  <div key={n.entry} className="pf-stacked__nowItem">
                    <span className="pf-stacked__nowMarker" aria-hidden="true">
                      <span className="pf-live">
                        <span className="pf-live__core" />
                      </span>
                    </span>
                    <div className="pf-stacked__nowBody">
                      <strong className="pf-stacked__nowRole">{n.role}</strong>
                      <span className="pf-stacked__nowDash" aria-hidden="true">
                        ·
                      </span>
                      <span className="pf-stacked__nowAt">{n.at}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pf-stacked__heroContact">
                {emailLink ? (
                  <a
                    href={emailLink.href}
                    className="pf-stacked__contact"
                    aria-label={`Send email to ${emailLink.handle}`}
                  >
                    {EmailIcon ? (
                      <span className="pf-stacked__contactIcon" aria-hidden="true">
                        <EmailIcon />
                      </span>
                    ) : null}
                    <span className="pf-stacked__contactText">
                      <span className="pf-stacked__contactLabel">Get in touch</span>
                      <span className="pf-stacked__contactSep" aria-hidden="true">·</span>
                      <span className="pf-stacked__contactHandle">{emailLink.handle}</span>
                    </span>
                    <span className="pf-stacked__contactArrow" aria-hidden="true">↗</span>
                  </a>
                ) : null}
              </div>
              <div className="pf-stacked__heroLinks" aria-label="Social profiles">
                <span className="pf-stacked__heroLinksLabel" aria-hidden="true">Connect</span>
                <div className="pf-stacked__heroLinksRow">
                  {emailLink ? (
                    <a
                      href={emailLink.href}
                      className="pf-link pf-stacked__heroLinksEmail"
                      aria-label={`Send email to ${emailLink.handle}`}
                    >
                      {EmailIcon ? <EmailIcon /> : null}
                      <span>Email</span>
                    </a>
                  ) : null}
                  {socialLinks.map((l) => {
                    const Icon = window.PFIcons[l.label];
                    return (
                      <a
                        key={l.label}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pf-link"
                        aria-label={`${l.label} profile (${l.handle}), opens in new tab`}
                      >
                        {Icon ? <Icon /> : null}
                        <span>{l.label}</span>
                        <span className="pf-link__arrow">↗</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StickyNav />

      <div
        id="hero-crystal-stage"
        className="pf-crystal-stage"
        aria-hidden="true"
      />

      <main id="main-content">
      <section className="pf-block pf-block--work" id="block-work" tabIndex={-1}>
        <div className="pf-block__inner">
          <header className="pf-blockHead">
            <RevealTitle text="Work" />
            <p className="pf-blockHead__sub">
              Mortgage tooling, quant trading, autonomy ops, and a few detours in between.{" "}
              <span className="pf-sub--desktop">Scroll the timeline from now back to Detroit.</span>
              <span className="pf-sub--mobile">Swipe the timeline from now back to Detroit.</span>
            </p>
          </header>
        </div>
        <WorkTimeline items={data.work} />
      </section>

      <section className="pf-block pf-block--projects pf-block--alt" id="block-projects">
        <div className="pf-block__inner">
          <header className="pf-blockHead">
            <RevealTitle text="Projects" />
            <p className="pf-blockHead__sub">Side projects from PWAs to MapReduce; most still on GitHub. Open one to read its file.</p>
          </header>
          <ProjectsTerminal items={data.projects} />
        </div>
      </section>

      <section className="pf-block pf-block--music" id="block-music">
        <div className="pf-block__inner">
          <header className="pf-blockHead pf-blockHead--music">
            <div>
              <RevealTitle text="Music" />
              <p className="pf-blockHead__sub">Techno, house, and ambient, all under my own name.</p>
            </div>
            <button
              id="visualizer-toggle"
              className="visualizer-toggle"
              type="button"
              aria-pressed="false"
              aria-describedby="visualizer-status"
            >
              <span className="visualizer-toggle__dot" aria-hidden="true" />
              <span className="visualizer-toggle-text">Audio visualizer</span>
            </button>
          </header>
          <p id="visualizer-status" className="pf-sr-only" aria-live="polite" />
          <NowPlayingHero data={data.music} />
        </div>
      </section>
      </main>

      <footer className="pf-foot pf-foot--stacked">
        <div className="pf-foot__inner">
          <span className="pf-mono pf-muted">© {new Date().getFullYear()} {data.identity.name}<span className="pf-mark">.</span></span>
          <span className="pf-mono pf-muted">
            All bugs were harmed in the making of this site.
            <span className="pf-foot__cursor" aria-hidden="true">█</span>
          </span>
        </div>
      </footer>

      <canvas id="audio-visualizer" className="audio-visualizer" aria-hidden="true"></canvas>
      <div id="visualizer-controls" className="visualizer-controls" aria-hidden="true">
        <button id="visualizer-mode-toggle" className="visualizer-control" type="button" aria-label="Toggle visualizer mode">
          Toggle mode
        </button>
        <button id="visualizer-exit" className="visualizer-control visualizer-exit" type="button" aria-label="Exit visualizer">
          Exit
        </button>
      </div>
    </div>);

}

Object.assign(window, { LayoutEditorial, LayoutIndex, LayoutStacked });