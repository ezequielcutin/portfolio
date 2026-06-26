let audioVisualizerInitialized = false;

function initAudioVisualizer() {
    if (audioVisualizerInitialized) return;

    const canvas = document.getElementById('audio-visualizer');
    const toggle = document.getElementById('visualizer-toggle');

    if (!canvas || !toggle) return;

    audioVisualizerInitialized = true;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let animationFrame = null;
    let isActive = false;
    let currentMode = 0; // 0: bars, 1: waveform, 2: circular, 3: ambient
    let pendingMode = null;
    let isStartingVisualizer = false;

    const modes = ['bars', 'waveform', 'circular', 'ambient'];
    const modeLabels = {
        bars: 'Bars',
        waveform: 'Waveform',
        circular: 'Circular',
        ambient: 'Ambient',
    };
    const TOGGLE_LABEL = 'Audio visualizer';
    let timeData = new Uint8Array(0);
    let freqData = new Float32Array(0);

    const controls = document.getElementById('visualizer-controls');
    const modeToggle = document.getElementById('visualizer-mode-toggle');
    const exitToggle = document.getElementById('visualizer-exit');

    function setStatus(message) {
        const status = document.getElementById('visualizer-status');
        if (status) status.textContent = message;
    }

    function syncToggleA11y() {
        toggle.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        toggle.setAttribute(
            'aria-label',
            isActive ? 'Stop audio visualizer' : 'Start audio visualizer'
        );
    }

    function updateVisualizerUI() {
        if (controls) {
            controls.classList.toggle('active', isActive);
            controls.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        }
        syncToggleA11y();
        if (!isActive) setStatus('');
    }

    function applyModeLabel() {
        const textSpan = toggle.querySelector('.visualizer-toggle-text');
        if (textSpan) {
            textSpan.textContent = TOGGLE_LABEL;
        }
        if (modeToggle) {
            const modeName = modeLabels[modes[currentMode]] || 'Bars';
            modeToggle.textContent = `Mode: ${modeName}`;
            modeToggle.setAttribute('aria-label', `Switch visualizer mode, currently ${modeName}`);
        }
        syncToggleA11y();
    }

    function cycleMode() {
        const nextMode = (currentMode + 1) % modes.length;

        if (nextMode === 3) {
            pendingMode = null;
            currentMode = 3;
            applyModeLabel();
            if (analyser) {
                if (microphone) {
                    microphone.disconnect();
                    microphone = null;
                }
                if (audioContext) {
                    audioContext.close();
                    audioContext = null;
                }
                analyser = null;
            }
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
            drawAmbientVisualizer();
            return;
        }

        if (!analyser) {
            if (isStartingVisualizer) return;
            pendingMode = nextMode;
            if (modeToggle) {
                modeToggle.textContent = `Mode: ${modeLabels[modes[nextMode]] || 'Bars'}`;
            }
            startVisualizer();
            return;
        }

        pendingMode = null;
        currentMode = nextMode;
        applyModeLabel();
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        drawVisualizer();
    }

    // Theme colors — pulled from the live --accent CSS variable (rust on dark).
    function getThemeColors() {
        const accent = (
            getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() ||
            '#e08055'
        );
        return {
            primary: accent,
            secondary: accent,
            glow: accent,
            shadow: 'rgba(224, 128, 85, 0.8)',
        };
    }

    // Set canvas size
    function resizeCanvas() {
        const width = Math.max(window.innerWidth || 1, 1);
        const height = Math.max(window.innerHeight || 1, 1);
        canvas.width = width;
        canvas.height = height;
    }

    requestAnimationFrame(() => {
        resizeCanvas();
        if (canvas.width === 0 || canvas.height === 0) {
            setTimeout(() => resizeCanvas(), 100);
        }
    });
    window.addEventListener('resize', debounce(resizeCanvas, 100));

    // Request microphone access and initialize audio
    async function startVisualizer() {
        if (isStartingVisualizer) return;
        isStartingVisualizer = true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }

            if (pendingMode !== null) {
                currentMode = pendingMode;
                pendingMode = null;
            }

            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;

            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);

            timeData = new Uint8Array(analyser.fftSize);
            freqData = new Float32Array(analyser.frequencyBinCount);

            isActive = true;
            canvas.classList.add('active');
            toggle.classList.add('active');

            applyModeLabel();
            updateVisualizerUI();

            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) {
                isStartingVisualizer = false;
                return;
            }

            drawVisualizer();
        } catch (error) {
            console.error('Error accessing microphone:', error);
            setStatus('Microphone access was denied. Ambient mode is running without audio input.');
            pendingMode = null;
            currentMode = 3;
            isActive = true;
            canvas.classList.add('active');
            toggle.classList.add('active');

            applyModeLabel();
            updateVisualizerUI();

            resizeCanvas();
            if (!animationFrame) {
                drawAmbientVisualizer();
            }
        } finally {
            isStartingVisualizer = false;
        }
    }

    // Stop visualizer and clean up
    function stopVisualizer() {
        isActive = false;
        canvas.classList.remove('active');
        toggle.classList.remove('active');

        const textSpan = toggle.querySelector('.visualizer-toggle-text');
        if (textSpan) {
            textSpan.textContent = TOGGLE_LABEL;
        }
        if (modeToggle) {
            modeToggle.textContent = 'Toggle mode';
            modeToggle.setAttribute('aria-label', 'Switch visualizer mode');
        }

        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }

        if (microphone) {
            microphone.disconnect();
            microphone = null;
        }

        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }

        analyser = null;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateVisualizerUI();
    }

    // Draw frequency bars - FULL WIDTH SPECTRUM ANALYZER
    function drawBars() {
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) return;
        }
        analyser.getFloatFrequencyData(freqData);
        const colors = getThemeColors();
        const primaryRgb = hexToRgb(colors.primary);
        const minDb = analyser.minDecibels;
        const maxDb = analyser.maxDecibels;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barCount = 96;
        const barWidth = canvas.width / barCount;
        const barSpacing = 1;
        const freqBins = freqData.length;
        if (freqBins === 0) return;

        const processedData = [];
        let energySum = 0;

        for (let i = 0; i < barCount; i++) {
            const normalizedPos = i / (barCount - 1);
            const logIndex = Math.pow(normalizedPos, 2.2) * (freqBins - 1);
            const dataIndex = Math.floor(logIndex);
            const nextIndex = Math.min(dataIndex + 1, freqBins - 1);
            const fraction = logIndex - dataIndex;

            const dbValue = freqData[dataIndex] * (1 - fraction) + freqData[nextIndex] * fraction;
            let norm = (dbValue - minDb) / (maxDb - minDb);
            norm = Math.max(0, Math.min(1, norm));

            norm = Math.pow(norm, 0.7);
            if (norm < 0.03) norm = 0;
            const tilt = 0.8 + Math.pow(normalizedPos, 0.5) * 2.0;
            const value = Math.min(1, norm * tilt);

            processedData.push(value);
            energySum += value;
        }

        const avgEnergy = energySum / barCount;
        const gain = avgEnergy > 0 ? Math.min(2.5, 0.6 / avgEnergy) : 1;

        const smoothedData = [];
        const smoothWindow = 2;
        for (let i = 0; i < barCount; i++) {
            let sum = 0;
            let count = 0;
            for (let j = -smoothWindow; j <= smoothWindow; j++) {
                const idx = i + j;
                if (idx >= 0 && idx < barCount) {
                    sum += processedData[idx] * gain;
                    count++;
                }
            }
            smoothedData.push(Math.min(1, sum / count));
        }

        const avgValue = smoothedData.reduce((a, b) => a + b, 0) / barCount;

        for (let i = 0; i < barCount; i++) {
            const intensity = smoothedData[i];
            const normalizedPos = i / (barCount - 1);

            const centerDistance = Math.abs(normalizedPos - 0.5) * 2;
            const minHeight = 4 + (1 - centerDistance) * 12;
            const maxHeight = canvas.height - 4;
            const barHeight = Math.min(maxHeight, minHeight + intensity * (canvas.height * 0.8));

            const hueProgress = normalizedPos;
            const r = Math.floor(primaryRgb.r * (1 - hueProgress * 0.3));
            const g = primaryRgb.g;
            const b = Math.floor(primaryRgb.b + hueProgress * 80);

            const x = i * barWidth;
            const y = Math.max(0, canvas.height - barHeight);

            let gradient;
            try {
                gradient = ctx.createLinearGradient(0, canvas.height, 0, y);
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.2)`);
                gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${0.5 + intensity * 0.5})`);
                gradient.addColorStop(1, `rgba(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)}, 1)`);
            } catch (e) {
                continue;
            }

            ctx.fillStyle = gradient;

            if (intensity > 0.5) {
                ctx.shadowBlur = 8 + intensity * 12;
                ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${intensity * 0.7})`;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.fillRect(x + barSpacing, y, barWidth - barSpacing * 2, barHeight);
        }

        ctx.shadowBlur = 0;
        const reflectionGradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - 50);
        reflectionGradient.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${0.05 + avgValue * 0.12})`);
        reflectionGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = reflectionGradient;
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    }

    // Helper function to convert hex to RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 224, g: 128, b: 85 };
    }

    // Draw waveform - MULTI-LAYERED VERSION
    function drawWaveform() {
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) return;
        }
        analyser.getByteTimeDomainData(timeData);
        const colors = getThemeColors();
        const primaryRgb = hexToRgb(colors.primary);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerY = canvas.height / 2;

        let totalAmplitude = 0;
        for (let i = 0; i < timeData.length; i++) {
            totalAmplitude += Math.abs(timeData[i] - 128);
        }
        const avgAmplitude = totalAmplitude / timeData.length;
        const amplitudeNormalized = avgAmplitude / 128;

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        const layers = [
            { offset: 0, alpha: 1, width: 3, scale: 1 },
            { offset: 0.2, alpha: 0.4, width: 2, scale: 0.6 }
        ];

        layers.forEach((layer, layerIndex) => {
            ctx.beginPath();
            ctx.lineWidth = layer.width + amplitudeNormalized * 2;

            const hueShift = layerIndex * 30;
            ctx.strokeStyle = `rgba(${Math.min(255, primaryRgb.r + hueShift)}, ${primaryRgb.g}, ${Math.min(255, primaryRgb.b + hueShift)}, ${layer.alpha})`;

            if (layerIndex === 0 && amplitudeNormalized > 0.3) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = colors.glow;
            } else {
                ctx.shadowBlur = 0;
            }

            const sliceWidth = canvas.width / Math.max(timeData.length - 1, 1);
            let x = 0;
            let prevX = 0;
            let prevY = centerY;

            for (let i = 0; i < timeData.length; i++) {
                const left = timeData[i - 1] ?? timeData[i];
                const right = timeData[i + 1] ?? timeData[i];
                const smoothed = (left + timeData[i] + right) / 3;

                const v = (smoothed - 128) / 128.0;
                const heightScale = canvas.height * 0.4 * layer.scale;
                const y = centerY + v * heightScale;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    const midX = (prevX + x) / 2;
                    const midY = (prevY + y) / 2;
                    ctx.quadraticCurveTo(prevX, prevY, midX, midY);
                }

                prevX = x;
                prevY = y;
                x += sliceWidth;
            }

            ctx.lineTo(prevX, prevY);
            ctx.stroke();
        });

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.2)`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        ctx.stroke();
    }

    // Draw circular visualization - SYMMETRIC VERSION
    let circularRotation = 0;
    function drawCircular() {
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) return;
        }
        analyser.getFloatFrequencyData(freqData);
        const colors = getThemeColors();
        const primaryRgb = hexToRgb(colors.primary);
        const minDb = analyser.minDecibels;
        const maxDb = analyser.maxDecibels;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = Math.min(canvas.width, canvas.height) * 0.1;
        const maxRadius = Math.min(canvas.width, canvas.height) * 0.42;

        const numBars = 48;
        const freqBins = freqData.length;
        if (freqBins === 0) return;

        const processedData = [];
        for (let i = 0; i < numBars; i++) {
            const normalizedPos = i / (numBars - 1);
            const logIndex = Math.pow(normalizedPos, 2.0) * (freqBins - 1);
            const dataIndex = Math.floor(logIndex);
            const nextIndex = Math.min(dataIndex + 1, freqBins - 1);
            const fraction = logIndex - dataIndex;

            const dbValue = freqData[dataIndex] * (1 - fraction) + freqData[nextIndex] * fraction;
            let norm = (dbValue - minDb) / (maxDb - minDb);
            norm = Math.max(0, Math.min(1, norm));

            norm = Math.pow(norm, 0.7);
            if (norm < 0.04) norm = 0;
            const tilt = 0.9 + Math.pow(normalizedPos, 0.6) * 1.8;
            processedData.push(Math.min(1, norm * tilt));
        }

        const avgValue = processedData.reduce((a, b) => a + b, 0) / processedData.length;
        const avgNormalized = avgValue;
        const isQuiet = avgNormalized < 0.05;
        const pulseScale = 0.85 + avgNormalized * 0.3;

        circularRotation += 0.008 + avgNormalized * 0.012;

        const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * pulseScale * 1.5);
        centerGradient.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${0.2 + avgNormalized * 0.2})`);
        centerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = centerGradient;
        ctx.fillRect(centerX - baseRadius * 2, centerY - baseRadius * 2, baseRadius * 4, baseRadius * 4);

        const innerRadius = baseRadius * pulseScale;

        for (let i = 0; i < numBars; i++) {
            const value = processedData[i];
            const intensity = value;

            const halfAngle = (i / numBars) * Math.PI;
            const angle1 = halfAngle + circularRotation;
            const angle2 = -halfAngle + circularRotation + Math.PI;

            if (isQuiet && intensity === 0) continue;
            const minLength = isQuiet ? 0 : 2 + avgNormalized * 8;
            const energyScale = 0.25 + avgNormalized * 0.75;
            const barLength = minLength + intensity * (maxRadius - baseRadius) * energyScale;

            const hueShift = (i / numBars) * 50;
            const r = Math.min(255, primaryRgb.r + hueShift);
            const g = primaryRgb.g;
            const b = Math.min(255, primaryRgb.b - hueShift * 0.4);

            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.5 + intensity * 0.5})`;
            ctx.lineWidth = 2 + intensity * 2;

            if (intensity > 0.6) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(angle1) * innerRadius, centerY + Math.sin(angle1) * innerRadius);
            ctx.lineTo(centerX + Math.cos(angle1) * (innerRadius + barLength), centerY + Math.sin(angle1) * (innerRadius + barLength));
            ctx.moveTo(centerX + Math.cos(angle2) * innerRadius, centerY + Math.sin(angle2) * innerRadius);
            ctx.lineTo(centerX + Math.cos(angle2) * (innerRadius + barLength), centerY + Math.sin(angle2) * (innerRadius + barLength));
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.stroke();
    }

    // Draw ambient animation (no audio input)
    let ambientTime = 0;
    function drawAmbientVisualizer() {
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) return;
        }
        ambientTime += 0.02;
        const colors = getThemeColors();
        const primaryRgb = hexToRgb(colors.primary);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(canvas.width, canvas.height) * 0.38;

        const rings = [
            { radius: 0.4, bars: 40, speed: 0.8, direction: 1 },
            { radius: 0.85, bars: 56, speed: 0.4, direction: -1 }
        ];

        const time2 = ambientTime * 2;
        const time1_5 = ambientTime * 1.5;

        rings.forEach((ring, ringIndex) => {
            const baseRadius = maxRadius * ring.radius;
            const barCount = ring.bars;
            const rotationOffset = ambientTime * ring.speed * ring.direction;

            const hueShift = ringIndex * 20;
            const r = Math.min(255, primaryRgb.r + hueShift);
            const g = primaryRgb.g;
            const b = Math.min(255, primaryRgb.b - hueShift * 0.3);

            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
            ctx.lineWidth = 3;

            ctx.beginPath();

            for (let i = 0; i < barCount; i++) {
                const angle = (i / barCount) * Math.PI * 2 + rotationOffset;

                const wave = Math.sin(time2 + i * 0.25) * 0.5 +
                            Math.sin(time1_5 + i * 0.15 + ringIndex * 2) * 0.5;
                const pulse = (wave + 1) / 2;

                const minLength = 15 + ringIndex * 10;
                const barLength = minLength + pulse * (30 + ringIndex * 25);

                const x1 = centerX + Math.cos(angle) * baseRadius;
                const y1 = centerY + Math.sin(angle) * baseRadius;
                const x2 = centerX + Math.cos(angle) * (baseRadius + barLength);
                const y2 = centerY + Math.sin(angle) * (baseRadius + barLength);

                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }

            ctx.stroke();
        });

        const centerPulse = (Math.sin(ambientTime * 2) + 1) / 2;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50 + centerPulse * 20);
        gradient.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${0.2 + centerPulse * 0.15})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - 80, centerY - 80, 160, 160);

        if (isActive && currentMode === 3) {
            animationFrame = requestAnimationFrame(drawAmbientVisualizer);
        }
    }

    // Main draw loop
    function drawVisualizer() {
        if (!isActive) return;

        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) return;
        }

        if (analyser && currentMode !== 3) {
            switch (currentMode) {
                case 0: drawBars(); break;
                case 1: drawWaveform(); break;
                case 2: drawCircular(); break;
            }
        } else if (currentMode === 3) {
            drawAmbientVisualizer();
            return;
        }

        animationFrame = requestAnimationFrame(drawVisualizer);
    }

    // Click handling with delay to detect double-click
    let clickTimeout = null;
    let clickCount = 0;

    toggle.addEventListener('click', (e) => {
        if (isStartingVisualizer) return;

        clickCount++;

        if (clickCount === 1) {
            clickTimeout = setTimeout(() => {
                if (!isActive) {
                    startVisualizer();
                } else {
                    stopVisualizer();
                }
                clickCount = 0;
            }, 250);
        } else if (clickCount === 2) {
            clearTimeout(clickTimeout);
            clickCount = 0;

            if (isActive) {
                cycleMode();
            } else {
                cycleMode();
            }
        }
    });

    if (modeToggle) {
        modeToggle.addEventListener('click', () => {
            if (isStartingVisualizer) return;
            if (!isActive) {
                startVisualizer();
                return;
            }
            cycleMode();
        });
    }

    if (exitToggle) {
        exitToggle.addEventListener('click', () => {
            stopVisualizer();
        });
    }

    // ESC always exits — useful once the canvas takes over the screen.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isActive) stopVisualizer();
    });

    updateVisualizerUI();
}

// Expose globally so the React app can boot it after mount.
window.initAudioVisualizer = initAudioVisualizer;
