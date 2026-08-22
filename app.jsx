// Portfolio entry — stacked layout, rust accent.
// Theme is resolved pre-paint by the inline script in index.html and
// flipped thereafter by ThemeToggle; nothing to set here.
function App() {
  React.useEffect(() => {
    // Defer until canvas is in the DOM and laid out.
    requestAnimationFrame(() => {
      if (typeof initHeaderAmbience === "function") initHeaderAmbience();
      if (typeof initAudioVisualizer === "function") initAudioVisualizer();
    });
  }, []);

  return <LayoutStacked data={window.PORTFOLIO_DATA} density="comfortable" />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
