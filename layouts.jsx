// Three layout variations for the portfolio
const { useState: useStateL, useEffect: useEffectL } = React;

// ═════════ EDITORIAL — centered, type-led, monospace metadata ═════════
function LayoutEditorial({ data, tab, setTab, density }) {
  const tabs = [
  { id: "work", label: "Work", num: "01" },
  { id: "projects", label: "Projects", num: "02" },
  { id: "music", label: "Music", num: "03" }];


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
          <span className="pf-mono pf-eyebrow">Currently</span>
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
              <p className="pf-eyebrow pf-mono">01 — Work</p>
              <h2 className="pf-sectionHead__title">Where I've been spending my hours.</h2>
            </header>
            <div className="pf-list">
              {data.work.map((w) =>
            <Entry
              key={w.id}
              id={`entry-${w.id}`}
              current={w.current}
              density={density}
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
              <p className="pf-eyebrow pf-mono">02 — Projects</p>
              <h2 className="pf-sectionHead__title">Builds, experiments, and side quests.</h2>
            </header>
            <div className="pf-list">
              {data.projects.map((p) =>
            <Entry
              key={p.id}
              id={`entry-${p.id}`}
              density={density}
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
              <p className="pf-eyebrow pf-mono">03 — Music</p>
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
  { id: "work", label: "Work", num: "01" },
  { id: "projects", label: "Projects", num: "02" },
  { id: "music", label: "Music", num: "03" }];


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
            
              <span className="pf-mono pf-rail__navNum">{t.num}</span>
              <span className="pf-rail__navLabel">{t.label}</span>
              <span className="pf-rail__navCount pf-mono">
                {t.id === "work" ? data.work.length : t.id === "projects" ? data.projects.length : data.music.tracks.length}
              </span>
            </button>
          )}
        </nav>

        <div className="pf-rail__now">
          <p className="pf-mono pf-eyebrow">Currently</p>
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
              <p className="pf-eyebrow pf-mono">Index — Work</p>
              <h2 className="pf-sectionHead__title">Seven roles, four cities.</h2>
            </header>
            <div className="pf-list">
              {data.work.map((w) =>
            <Entry
              key={w.id}
              id={`entry-${w.id}`}
              current={w.current}
              density={density}
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
              <p className="pf-eyebrow pf-mono">Index — Projects</p>
              <h2 className="pf-sectionHead__title">Things I've shipped.</h2>
            </header>
            <div className="pf-list">
              {data.projects.map((p) =>
            <Entry
              key={p.id}
              id={`entry-${p.id}`}
              density={density}
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
              <p className="pf-eyebrow pf-mono">Index — Music</p>
              <h2 className="pf-sectionHead__title">Late-night studio output.</h2>
            </header>
            <MusicBlock data={data.music} />
          </section>
        }
      </main>
    </div>);

}

// ═════════ STACKED — bold full-bleed sections, no tabs ═════════
function LayoutStacked({ data, density }) {
  return (
    <div className="pf-shell pf-shell--stacked">
      <section className="pf-block pf-block--hero">
        <canvas id="header-ambience" className="pf-header-ambience" aria-hidden="true"></canvas>
        <div className="pf-block__inner">
          <p className="pf-mono pf-eyebrow">
</p>
          <h1 className="pf-stacked__name">
            {data.identity.name.split("").map((ch, i) => (
              <span
                key={i}
                className="pf-stacked__char"
                style={{ animationDelay: `${i * 65}ms` }}
              >{ch === " " ? " " : ch}</span>
            ))}
            <span
              className="pf-stacked__period pf-stacked__char"
              style={{ animationDelay: `${data.identity.name.length * 65}ms` }}
            >.</span>
          </h1>
          <p className="pf-stacked__tagline">{data.identity.tagline}</p>
          <div className="pf-stacked__heroGrid">
            <div className="pf-stacked__photoFrame">
              <img className="pf-stacked__photo" src={data.identity.headshot} alt={data.identity.name} />
            </div>
            <div className="pf-stacked__heroText">
              <p className="pf-stacked__bio">{data.identity.bio}</p>
              <div className="pf-stacked__now">
                <p className="pf-mono pf-eyebrow">Currently</p>
                {data.now.map((n) => <p key={n.entry} className="pf-stacked__nowItem">
                    <span className="pf-live"><span className="pf-live__core" /></span>
                    <strong>{n.role}</strong>
                    <span className="pf-muted">  ·  {n.at}</span>
                  </p>
                )}
              </div>
              <div className="pf-stacked__heroLinks">
                {data.identity.links.map((l) => {
                  const Icon = window.PFIcons[l.label];
                  return (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="pf-link">
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
      </section>

      <section className="pf-block pf-block--work" id="block-work">
        <div className="pf-block__inner">
          <header className="pf-blockHead">
            <span className="pf-mono pf-eyebrow">01</span>
            <h2 className="pf-blockHead__title">Work</h2>
            <p className="pf-blockHead__sub">Seven roles across software, autonomous systems, and entrepreneurship.</p>
          </header>
          <div className="pf-list">
            {data.work.map((w) =>
            <Entry
              key={w.id}
              id={`entry-${w.id}`}
              current={w.current}
              density={density}
              header={<><span className="pf-entry__role">{w.title}</span><span className="pf-entry__at"> at {w.org}</span></>}
              meta={`${w.date} · ${w.location}`}>
              
                <WorkBody item={w} />
              </Entry>
            )}
          </div>
        </div>
      </section>

      <section className="pf-block pf-block--projects pf-block--alt" id="block-projects">
        <div className="pf-block__inner">
          <header className="pf-blockHead">
            <span className="pf-mono pf-eyebrow">02</span>
            <h2 className="pf-blockHead__title">Projects</h2>
            <p className="pf-blockHead__sub">Builds spanning full-stack apps, distributed systems, and graphics.</p>
          </header>
          <div className="pf-list">
            {data.projects.map((p) =>
            <Entry
              key={p.id}
              id={`entry-${p.id}`}
              density={density}
              header={<><span className="pf-entry__role">{p.title}</span><span className="pf-entry__at"> — {p.tagline}</span></>}
              meta={p.date}>
              
                <ProjectBody item={p} />
              </Entry>
            )}
          </div>
        </div>
      </section>

      <section className="pf-block pf-block--music" id="block-music">
        <div className="pf-block__inner">
          <header className="pf-blockHead pf-blockHead--music">
            <div>
              <span className="pf-mono pf-eyebrow">03</span>
              <h2 className="pf-blockHead__title">Music</h2>
              <p className="pf-blockHead__sub">Techno, house, ambient — produced under my own name.</p>
            </div>
            <button
              id="visualizer-toggle"
              className="visualizer-toggle"
              aria-label="Toggle audio visualizer"
              type="button"
            >
              <span className="visualizer-toggle__dot" aria-hidden="true" />
              <span className="visualizer-toggle-text">AUDIO VISUALIZER (EXPERIMENTAL)</span>
            </button>
          </header>
          <NowPlayingHero data={data.music} />
        </div>
      </section>

      <footer className="pf-foot pf-foot--stacked">
        <div className="pf-foot__inner">
          <span className="pf-mono pf-muted">© {new Date().getFullYear()} {data.identity.name}</span>
          <span className="pf-mono pf-muted">
            All bugs were harmed in the making of this site.
            <span className="pf-foot__cursor" aria-hidden="true">█</span>
          </span>
        </div>
      </footer>

      <canvas id="audio-visualizer" className="audio-visualizer" aria-hidden="true"></canvas>
      <div id="visualizer-controls" className="visualizer-controls" aria-hidden="true">
        <button id="visualizer-mode-toggle" className="visualizer-control" type="button" aria-label="Toggle visualizer mode">
          TOGGLE MODE
        </button>
        <button id="visualizer-exit" className="visualizer-control visualizer-exit" type="button" aria-label="Exit visualizer">
          EXIT
        </button>
      </div>
    </div>);

}

Object.assign(window, { LayoutEditorial, LayoutIndex, LayoutStacked });