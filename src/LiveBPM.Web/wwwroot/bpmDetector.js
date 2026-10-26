window.BpmDetector = (function () {
    const MIN_BPM = 40;
    const MAX_BPM = 220;

    const defaults = {
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
    let running = false;
    let dotNetRef = null;
    let rafId = null;

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
            bpm: Math.round(lastBpm * 10) / 10,
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

        const now = audioContext.currentTime;
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
        mergeOptions(userOptions);
        applyFilterSettings();

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
