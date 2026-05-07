// Portfolio entry — stacked layout, dark (warm) theme, rust accent.
function App() {
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    // Defer until canvas is in the DOM and laid out.
    requestAnimationFrame(() => {
      if (typeof initHeaderAmbience === "function") initHeaderAmbience();
      if (typeof initAudioVisualizer === "function") initAudioVisualizer();
    });
  }, []);

  return <LayoutStacked data={window.PORTFOLIO_DATA} density="comfortable" />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
