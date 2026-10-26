window.BpmDetector = (function () {
    const MIN_BPM = 40;
    const MAX_BPM = 220;

    const defaults = {
        detectionMode: 'spectral', // 'spectral' | 'threshold'
        sensitivity: 1.5,
        minBeatIntervalMs: 273,
        smoothing: 0.7,
        filterFrequency: 800,
        filterQ: 1.0,
        energyFloor: 0.015,
        beatHistorySize: 16,
        energyHistorySize: 43,
        targetBpm: 0
    };

    let options = { ...defaults };

    let audioContext = null;
    let stream = null;
    let sourceNode = null;
    let filterNode = null;
    let analyser = null;
    let buffer = null;
    let spectralAnalyser = null; // unfiltered analyser feeding the spectral/onset path
    let spectralBuffer = null;
    let running = false;
    let dotNetRef = null;
    let rafId = null;

    // --- threshold detector state ---
    let energyHistory = [];
    let historyIndex = 0;
    let beatTimes = [];
    let beatPhase = 4;
    let lastBeatTime = 0;
    let lastBpm = 0;
    let lastEnergy = 0;
    let lastDisplayEnergy = 0;
    let lastCallbackTime = 0;
    let confidence = 0;

    // --- spectral / onset detector state ---
    let bandEnergies = null;      // per-frame energy per mel band (previous frame)
    let onsetHistory = [];        // rolling onset-strength values
    let onsetHop = 0;             // seconds between process() frames (hop size)
    let lastOnsetFrameTime = 0;
    let lastTempoEstimateTime = 0;

    function mergeOptions(userOptions) {
        options = { ...defaults, ...(userOptions || {}) };
    }

    function computeEnergy(data) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            const v = data[i];
            sum += v * v;
        }
        return Math.sqrt(sum / data.length);
    }

    // ---------------------------------------------------------------------
    // Spectral onset-strength + autocorrelation tempo estimation
    // ---------------------------------------------------------------------

    const MEL_BANDS = 48;
    const MEL_LO = 40;        // Hz
    const MEL_HI = 6000;      // Hz

    // Pre-compute a mel-spaced list of FFT-bin edge indices for the analyser's
    // frequency resolution at the given sample rate.
    function makeMelBands(sampleRate, fftSize) {
        const binHz = sampleRate / fftSize; // width of each FFT bin
        const numBins = fftSize / 2;        // usable bins (0..Nyquist)
        const edges = new Array(MEL_BANDS + 1);
        const melLo = 1127 * Math.log(1 + MEL_LO / 700);
        const melHi = 1127 * Math.log(1 + MEL_HI / 700);
        for (let b = 0; b <= MEL_BANDS; b++) {
            const mel = melLo + (melHi - melLo) * (b / MEL_BANDS);
            const hz = 700 * (Math.exp(mel / 1127) - 1);
            edges[b] = Math.max(0, Math.min(numBins, Math.floor(hz / binHz)));
        }
        return edges; // length MEL_BANDS + 1
    }

    let melEdges = null;

    // Spectral flux (positive energy deltas summed across mel bands). This is
    // the "onset strength": it spikes on new energy (attacks/beats) but stays
    // low on sustained loudness, so compressed/quiet phone playback still
    // produces meaningful periodicity.
    function computeSpectralFlux(magnitude, edges) {
        let previous = bandEnergies;
        const now = new Float32Array(MEL_BANDS);
        for (let b = 0; b < MEL_BANDS; b++) {
            const i0 = edges[b];
            const i1 = edges[b + 1];
            if (i1 <= i0) { now[b] = 0; continue; }
            let sum = 0;
            for (let i = i0; i < i1; i++) sum += magnitude[i];
            // Average magnitude per band, then take its square as "energy".
            const avg = sum / (i1 - i0);
            now[b] = avg * avg;
        }
        bandEnergies = now;

        if (!previous) return 0; // first frame: no delta yet
        let flux = 0;
        for (let b = 0; b < MEL_BANDS; b++) {
            const d = now[b] - previous[b];
            if (d > 0) flux += d;
        }
        return flux;
    }

    // Median of an array (copy-safe).
    function medianOf(arr) {
        if (arr.length === 0) return 0;
        const s = arr.slice().sort((a, b) => a - b);
        const m = Math.floor(s.length / 2);
        return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
    }

    // Unbiased autocorrelation of `data` for lags in [minLag, maxLag].
    // Returns an array of {lag, value}. A local max over a meaningful range
    // indicates the period of the onset signal.
    function autocorrelate(data, minLag, maxLag) {
        const n = data.length;
        const result = [];
        for (let lag = minLag; lag <= maxLag; lag++) {
            let s = 0;
            const count = n - lag;
            for (let i = 0; i < count; i++) {
                s += data[i] * data[i + lag];
            }
            result.push({ lag, value: count > 0 ? s / count : 0 });
        }
        return result;
    }

    // Estimate tempo from the onset history using autocorrelation. Returns
    // { bpm, confidence } or { bpm: 0, confidence: 0 } when inconclusive.
    function estimateTempoFromOnsets() {
        if (onsetHistory.length < 32) return { bpm: 0, confidence: 0 };

        const n = onsetHistory.length;
        const data = onsetHistory;

        // Search periods from 0.27s (220 BPM) down to 1.5s (40 BPM).
        const hopsPerSecond = Math.round(1 / onsetHop);
        const minLag = Math.max(1, Math.round(hopsPerSecond * (60 / MAX_BPM)));
        const maxLag = Math.min(n - 1, Math.round(hopsPerSecond * (60 / MIN_BPM)));

        if (maxLag <= minLag) return { bpm: 0, confidence: 0 };

        const corr = autocorrelate(data, minLag, maxLag);

        // Find local maxima with a widening search window (proportional to lag
        // so the window tracks the tempo resolution). A point must be >= its
        // neighbours within the window to count, which filters out noisy
        // micro-peaks and picks the stable, dominant periodicity.
        const peakWidth = Math.max(1, Math.round(minLag * 0.1));
        const peaks = [];
        for (let i = 0; i < corr.length; i++) {
            const c = corr[i];
            if (c.value <= 0) continue;
            const lo = Math.max(0, i - peakWidth);
            const hi = Math.min(corr.length - 1, i + peakWidth);
            let isPeak = true;
            for (let j = lo; j <= hi; j++) {
                if (j !== i && corr[j].value > c.value) { isPeak = false; break; }
            }
            if (isPeak) peaks.push({ lag: c.lag, value: c.value });
        }

        if (peaks.length === 0) return { bpm: 0, confidence: 0 };

        // Sort by strength (descending) and pick the strongest.
        peaks.sort((a, b) => b.value - a.value);
        const bestPeak = peaks[0];

        const lag = bestPeak.lag;
        const tempo = 60 / (lag * onsetHop);

        const confidence = computeTempoConfidence(corr, bestPeak);

        return { bpm: tempo, confidence, peaks };
    }

    function computeTempoConfidence(corr, peak) {
        // Confidence = (peak vs. mean of correlation) mapped to 0..100.
        if (!peak || corr.length === 0) return 0;
        let sum = 0;
        for (let i = 0; i < corr.length; i++) sum += corr[i].value;
        const mean = sum / corr.length;
        const contrast = peak.value / (mean + 1e-9);
        // A strong periodic signal has contrast well above 1.
        const confidence = Math.max(0, Math.min(100, Math.round((contrast - 1) * 40)));
        return confidence;
    }

    // Given the raw autocorrelation peaks and the previous estimate, choose the
    // most stable tempo: prefer a strong peak whose tempo lies in the same
    // octave as lastBpm, so the reading doesn't flip between half/double tempo.
    function reconcileTempo(rawBpm, peaks) {
        if (lastBpm <= 0) return rawBpm;

        function bpmFromLag(lag) {
            let b = 60 / (lag * onsetHop);
            while (b < MIN_BPM) b *= 2;
            while (b > MAX_BPM) b /= 2;
            return b;
        }

        let best = rawBpm;
        let bestScore = -Infinity;

        const strongest = peaks && peaks.length ? peaks[0].value : 1;
        const candidates = (peaks && peaks.length) ? peaks : [{ lag: 0, value: strongest }];

        for (const p of candidates) {
            const c = p.lag > 0 ? bpmFromLag(p.lag) : rawBpm;
            // Unfold all octaves of `c` that fall inside the BPM range.
            let o = c;
            while (o > MIN_BPM) o /= 2;
            while (o <= MAX_BPM) {
                if (o >= MIN_BPM && o <= MAX_BPM) {
                    const dist = Math.abs(o - lastBpm) / lastBpm;
                    // Weight: favour a strong peak close to the current tempo.
                    const peakNorm = p.value <= 0 ? 0 : p.value / strongest;
                    const score = peakNorm * 2 - dist * 4;
                    if (score > bestScore) {
                        bestScore = score;
                        best = o;
                    }
                }
                o *= 2;
            }
        }

        return best;
    }

    function spectralProcess(now) {
        // The analyser's FFT buffer only refreshes once per fftSize/sampleRate
        // seconds (~46ms @ 2048/44.1k), but requestAnimationFrame fires ~60fps.
        // Throttle to one spectral sample per analyser frame so onset history
        // stays correctly time-aligned and we don't double-count frames.
        if (now - lastOnsetFrameTime < onsetHop * 0.75) {
            return;
        }
        lastOnsetFrameTime = now;

        spectralAnalyser.getFloatFrequencyData(spectralBuffer);
        // Convert dB-magnitude to linear magnitude.
        const magnitude = new Float32Array(spectralBuffer.length);
        for (let i = 0; i < spectralBuffer.length; i++) {
            magnitude[i] = Math.pow(10, spectralBuffer[i] / 20);
        }

        const flux = computeSpectralFlux(magnitude, melEdges);
        onsetHistory.push(flux);
        // Keep ~8 seconds of onsets.
        const maxOnsetLen = Math.ceil(12 / onsetHop);
        while (onsetHistory.length > maxOnsetLen) onsetHistory.shift();

        // Recompute the tempo estimate at most every ~100ms, not every frame.
        if (now - lastTempoEstimateTime < 0.1) {
            return;
        }
        lastTempoEstimateTime = now;

        const est = estimateTempoFromOnsets();
        let bpm = est.bpm;

        if (bpm > 0) {
            // Constrain to range via octave folding.
            while (bpm < MIN_BPM) bpm *= 2;
            while (bpm > MAX_BPM) bpm /= 2;

            if (options.targetBpm > 0) {
                bpm = snapToTargetBpm(bpm);
            } else if (lastBpm > 0) {
                bpm = reconcileTempo(bpm, est.peaks);
            }

            // Smooth against previous value with a substantial minimum so the
            // reading is stable rather than chasing every noisy estimate.
            if (lastBpm > 0) {
                const follow = 1 - options.smoothing; // how much to follow new data
                const scaled = Math.min(0.25, follow * (0.25 + 0.75 * (est.confidence / 100)));
                bpm = lastBpm * (1 - scaled) + bpm * scaled;
            }
        }

        confidence = est.confidence;
        lastBpm = bpm;
    }

    // Cheap per-frame beat-grid phase tracking for the visual 4-step indicator,
    // including while the tempo estimate is being throttled.
    function updateSpectralPhase(now) {
        if (lastBpm > 0) {
            const periodMs = 60000 / lastBpm;
            const phase = (Math.floor((now * 1000) / periodMs) % 4) + 1;
            beatPhase = phase >= 1 && phase <= 4 ? phase : 4;
        } else {
            beatPhase = 4;
        }
    }

    function computeAverageEnergy() {
        const size = options.energyHistorySize;
        if (energyHistory.length === 0) return 0;
        let sum = 0;
        const count = Math.min(energyHistory.length, size);
        for (let i = 0; i < count; i++) {
            sum += energyHistory[i];
        }
        return sum / count;
    }

    function computeVariance(average) {
        const count = Math.min(energyHistory.length, options.energyHistorySize);
        if (count === 0) return 0;
        let sum = 0;
        for (let i = 0; i < count; i++) {
            const diff = energyHistory[i] - average;
            sum += diff * diff;
        }
        return sum / count;
    }

    function median(values) {
        if (values.length === 0) return 0;
        const sorted = values.slice().sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 1
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    function filterOutliers(intervals) {
        if (intervals.length < 4) return intervals.slice();

        const med = median(intervals);
        if (med <= 0) return intervals.slice();

        const deviations = intervals.map(v => Math.abs(v - med));
        const mad = median(deviations);
        // Allow intervals within ~1.5x the median absolute deviation plus a small tolerance.
        const tolerance = Math.max(med * 0.25, mad * 2.5);

        return intervals.filter(v => Math.abs(v - med) <= tolerance);
    }

    function correctOctave(bpm) {
        if (lastBpm <= 0 || bpm <= 0) return bpm;

        const ratios = [0.5, 1, 2];
        let bestRatio = 1;
        let bestError = Infinity;

        for (const ratio of ratios) {
            const candidate = bpm * ratio;
            const error = Math.abs(candidate - lastBpm) / lastBpm;
            if (error < bestError) {
                bestError = error;
                bestRatio = ratio;
            }
        }

        // Only apply octave correction if the current estimate is fairly close to a multiple.
        if (bestError < 0.25) {
            return bpm * bestRatio;
        }
        return bpm;
    }

    function computeConfidence(intervals) {
        if (intervals.length < 4) return 0;

        const med = median(intervals);
        if (med <= 0) return 0;

        const deviations = intervals.map(v => Math.abs(v - med));
        const mad = median(deviations);
        const relativeDeviation = mad / med;

        // Confidence is high when relative deviation is low.
        return Math.max(0, Math.min(100, Math.round((1 - Math.min(relativeDeviation, 1)) * 100)));
    }

    function snapToTargetBpm(bpm) {
        if (!options.targetBpm || options.targetBpm <= 0) return bpm;

        const ratios = [0.25, 0.5, 1, 2, 4];
        let bestBpm = bpm;
        let bestError = Infinity;

        for (const ratio of ratios) {
            const candidate = bpm * ratio;
            const error = Math.abs(candidate - options.targetBpm) / options.targetBpm;
            if (error < bestError) {
                bestError = error;
                bestBpm = candidate;
            }
        }

        // Only snap if the detected tempo is reasonably close to a target multiple.
        if (bestError < 0.20) {
            return bestBpm;
        }
        return bpm;
    }

    function calculateBpm(now) {
        if (beatTimes.length < 4) return lastBpm;

        const intervals = [];
        for (let i = 1; i < beatTimes.length; i++) {
            intervals.push(beatTimes[i] - beatTimes[i - 1]);
        }

        const filtered = filterOutliers(intervals);
        if (filtered.length < 2) return lastBpm;

        const interval = median(filtered);
        if (interval <= 0) return lastBpm;

        let bpm = 60 / interval;

        // Keep BPM in a sensible range.
        while (bpm < MIN_BPM && bpm > 0) bpm *= 2;
        while (bpm > MAX_BPM) bpm /= 2;

        if (options.targetBpm > 0) {
            // Lock to the nearest simple multiple of the user-supplied target tempo.
            bpm = snapToTargetBpm(bpm);
        } else {
            // Try to stay in the same octave once we have a stable value.
            bpm = correctOctave(bpm);
        }

        confidence = computeConfidence(filtered);

        // Apply smoothing.
        if (lastBpm > 0) {
            const smoothing = options.smoothing;
            // Reduce smoothing when confidence is low so the detector can settle faster.
            const effectiveSmoothing = smoothing * (0.3 + 0.7 * (confidence / 100));
            bpm = lastBpm * effectiveSmoothing + bpm * (1 - effectiveSmoothing);
        }

        return bpm;
    }

    function notifyCallback() {
        if (!dotNetRef) return;

        const now = performance.now();
        if (now - lastCallbackTime < 100) return;
        lastCallbackTime = now;

        dotNetRef.invokeMethodAsync('UpdateBpm', {
            bpm: Math.round(lastBpm),
            energy: lastEnergy,
            displayEnergy: lastDisplayEnergy,
            beatCount: beatTimes.length,
            confidence: confidence,
            beatPhase: beatPhase
        });
    }

    function toDisplayLevel(energy) {
        // Map RMS energy to a decibel-like display scale so quiet microphone signals
        // still produce a useful bar. -60 dB maps to 0%, 0 dB maps to 100%.
        if (energy <= 0) return 0;
        const db = 20 * Math.log10(energy);
        const minDb = -60;
        const maxDb = 0;
        return Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb)));
    }

    function process() {
        if (!running) return;

        analyser.getFloatTimeDomainData(buffer);
        const energy = computeEnergy(buffer);
        lastEnergy = energy;
        lastDisplayEnergy = toDisplayLevel(energy);

        const now = audioContext.currentTime;

        if (options.detectionMode === 'spectral') {
            spectralProcess(now);
            updateSpectralPhase(now);
            notifyCallback();
            rafId = requestAnimationFrame(process);
            return;
        }

        energyHistory[historyIndex] = energy;
        historyIndex = (historyIndex + 1) % options.energyHistorySize;

        const averageEnergy = computeAverageEnergy();
        const variance = computeVariance(averageEnergy);

        // Adaptive sensitivity: lower the threshold in quiet/consistent passages,
        // raise it when the signal is noisy.
        const baseSensitivity = options.sensitivity;
        const noisePenalty = Math.min(0.8, variance * 6);
        const sensitivity = Math.max(1.05, baseSensitivity - noisePenalty);
        const threshold = Math.max(options.energyFloor, averageEnergy * sensitivity);

        const minBeatInterval = options.minBeatIntervalMs / 1000;
        const timeSinceLastBeat = now - lastBeatTime;

        if (energy > threshold && energy > options.energyFloor && timeSinceLastBeat > minBeatInterval) {
            beatTimes.push(now);
            beatPhase = beatPhase >= 4 ? 1 : beatPhase + 1;
            while (beatTimes.length > options.beatHistorySize) {
                beatTimes.shift();
            }
            lastBeatTime = now;
            lastBpm = calculateBpm(now);
        }

        notifyCallback();
        rafId = requestAnimationFrame(process);
    }

    function applyFilterSettings() {
        if (filterNode) {
            filterNode.frequency.value = options.filterFrequency;
            filterNode.Q.value = options.filterQ;
        }
    }

    function resetState() {
        energyHistory = new Array(options.energyHistorySize).fill(0);
        historyIndex = 0;
        beatTimes = [];
        beatPhase = 4;
        lastBeatTime = 0;
        lastBpm = 0;
        lastEnergy = 0;
        lastDisplayEnergy = 0;
        lastCallbackTime = 0;
        confidence = 0;
        bandEnergies = null;
        onsetHistory = [];
        lastOnsetFrameTime = 0;
        lastTempoEstimateTime = 0;
    }

    async function start(dotNetReference, userOptions) {
        if (running) return;

        mergeOptions(userOptions);
        dotNetRef = dotNetReference;

        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false
                }
            });

            sourceNode = audioContext.createMediaStreamSource(stream);

            filterNode = audioContext.createBiquadFilter();
            filterNode.type = 'bandpass';
            filterNode.frequency.value = options.filterFrequency;
            filterNode.Q.value = options.filterQ;

            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            buffer = new Float32Array(analyser.fftSize);

            sourceNode.connect(filterNode);
            filterNode.connect(analyser);

            // Unfiltered analyser feeding the spectral/onset path. Tapping the
            // source directly keeps the full-spectrum transients that the
            // bandpass would otherwise discard.
            spectralAnalyser = audioContext.createAnalyser();
            spectralAnalyser.fftSize = 2048;
            spectralAnalyser.smoothingTimeConstant = 0;
            spectralBuffer = new Float32Array(spectralAnalyser.frequencyBinCount);
            sourceNode.connect(spectralAnalyser);

            melEdges = makeMelBands(audioContext.sampleRate, spectralAnalyser.fftSize);
            onsetHop = spectralAnalyser.fftSize / audioContext.sampleRate; // seconds per frame

            running = true;
            resetState();
            process();
        } catch (error) {
            console.error('Failed to start BPM detector:', error);
            if (dotNetRef) {
                dotNetRef.invokeMethodAsync('OnError', error.name === 'NotAllowedError'
                    ? 'Microphone permission denied.'
                    : error.message);
            }
            await cleanup();
        }
    }

    function configure(userOptions) {
        const previousMode = options.detectionMode;
        mergeOptions(userOptions);
        applyFilterSettings();

        // Switching engines mid-stream leaves stale state; reset the relevant
        // accumulators so the new engine starts from a clean slate.
        if (previousMode !== options.detectionMode) {
            if (options.detectionMode === 'spectral') {
                bandEnergies = null;
                onsetHistory = [];
                lastOnsetFrameTime = 0;
                lastTempoEstimateTime = 0;
            } else {
                beatTimes = [];
                lastBeatTime = 0;
                energyHistory = new Array(options.energyHistorySize).fill(0);
                historyIndex = 0;
            }
        }

        // Trim or grow history buffers if sizes changed.
        if (energyHistory.length !== options.energyHistorySize) {
            const newHistory = new Array(options.energyHistorySize).fill(0);
            const copyCount = Math.min(energyHistory.length, options.energyHistorySize);
            for (let i = 0; i < copyCount; i++) {
                newHistory[i] = energyHistory[(historyIndex - copyCount + i + energyHistory.length) % energyHistory.length];
            }
            energyHistory = newHistory;
            historyIndex = 0;
        }

        while (beatTimes.length > options.beatHistorySize) {
            beatTimes.shift();
        }
    }

    function reset() {
        resetState();
    }

    async function cleanup() {
        running = false;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (audioContext && audioContext.state !== 'closed') {
            await audioContext.close();
        }
        audioContext = null;
            sourceNode = null;
            filterNode = null;
            analyser = null;
            buffer = null;
            spectralAnalyser = null;
            spectralBuffer = null;
            bandEnergies = null;
            onsetHistory = [];
            melEdges = null;
            dotNetRef = null;
    }

    async function stop() {
        if (!running) return;
        await cleanup();
    }

    return {
        start,
        stop,
        configure,
        reset
    };
})();
