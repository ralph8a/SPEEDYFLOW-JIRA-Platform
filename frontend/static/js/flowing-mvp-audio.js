/* Flowing MVP - Audio utilities (separate file)
   Provides simple WebAudio-based alerts and UI control binding.
*/
(function () {
    class FlowingAudio {
        constructor() {
            this.audioCtx = null;
            // Prefer userSettings stored in localStorage (header menu)
            try {
                const us = JSON.parse(localStorage.getItem('userSettings') || '{}');
                this.audioEnabled = us.soundEnabled !== undefined ? !!us.soundEnabled : (localStorage.getItem('flowing_sound_enabled') !== '0');
                this.audioVolume = us.soundVolume !== undefined ? parseFloat(us.soundVolume) : parseFloat(localStorage.getItem('flowing_sound_volume') || '0.45');
            } catch (e) {
                this.audioEnabled = localStorage.getItem('flowing_sound_enabled') !== '0';
                this.audioVolume = parseFloat(localStorage.getItem('flowing_sound_volume') || '0.45');
            }
            // auto-init when script loads
            this._ready = false;
        }

        attachControls() {
            try {
                // Try multiple selectors: app settings toggle may be in header 'ajustes'
                const soundBtn = document.getElementById('flowingSoundBtn') || document.getElementById('settingsSoundBtn') || document.querySelector('[data-sound-toggle]') || document.querySelector('.settings-sound');
                // Header settings use checkbox with id 'soundEnabled'
                const settingsCheckbox = document.getElementById('soundEnabled') || document.querySelector('input[id="soundEnabled"]');
                const soundVol = document.getElementById('flowingSoundVol') || document.getElementById('soundVolume');
                if (soundBtn) {
                    soundBtn.textContent = this.audioEnabled ? '🔔' : '🔕';
                    soundBtn.title = this.audioEnabled ? 'Sound enabled' : 'Sound muted';
                    soundBtn.addEventListener('click', () => {
                        this.audioEnabled = !this.audioEnabled;
                        localStorage.setItem('flowing_sound_enabled', this.audioEnabled ? '1' : '0');
                        soundBtn.textContent = this.audioEnabled ? '🔔' : '🔕';
                        soundBtn.title = this.audioEnabled ? 'Sound enabled' : 'Sound muted';
                        this.playAlert('beep');
                    }, { passive: true });
                }
                if (soundVol) {
                    soundVol.value = this.audioVolume;
                    soundVol.addEventListener('input', (e) => {
                        this.audioVolume = parseFloat(e.target.value || 0.6);
                        localStorage.setItem('flowing_sound_volume', String(this.audioVolume));
                        try {
                            const us = JSON.parse(localStorage.getItem('userSettings') || '{}');
                            us.soundVolume = this.audioVolume; localStorage.setItem('userSettings', JSON.stringify(us));
                        } catch (e) { }
                    }, { passive: true });
                }
                if (settingsCheckbox) {
                    // Checkbox in header menu controls sound enabled
                    settingsCheckbox.checked = !!this.audioEnabled;
                    settingsCheckbox.addEventListener('change', (e) => {
                        this.audioEnabled = !!e.target.checked;
                        try {
                            const us = JSON.parse(localStorage.getItem('userSettings') || '{}');
                            us.soundEnabled = !!this.audioEnabled; localStorage.setItem('userSettings', JSON.stringify(us));
                        } catch (e) { }
                        try { this.playAlert('beep'); } catch (e) { }
                    }, { passive: true });
                }
            } catch (e) { console.warn('FlowingAudio.attachControls error', e); }
            // Try to preload fallback audio file if present
            try {
                const url = '/static/sounds/vscode_notify.mp3';
                fetch(url, { method: 'HEAD' }).then(r => {
                    if (r.ok) {
                        try { this.audioElement = new Audio(url); } catch (e) { /* ignore */ }
                    }
                }).catch(() => { });
            } catch (e) { /* ignore */ }
        }

        ensureAudioContext() {
            try {
                if (!this.audioEnabled) return null;
                if (!this.audioCtx) {
                    const Ctx = window.AudioContext || window.webkitAudioContext;
                    if (!Ctx) return null;
                    this.audioCtx = new Ctx();
                }
                return this.audioCtx;
            } catch (e) { return null; }
        }

        playTone(frequency = 880, duration = 0.08, type = 'sine') {
            try {
                const ctx = this.ensureAudioContext();
                if (!ctx) return;
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = type;
                o.frequency.setValueAtTime(frequency, ctx.currentTime);
                g.gain.setValueAtTime(Math.max(0, Math.min(1, this.audioVolume || 0.6)), ctx.currentTime);
                o.connect(g);
                g.connect(ctx.destination);
                const now = ctx.currentTime;
                o.start(now);
                o.stop(now + duration);
            } catch (e) { /* ignore */ }
        }

        playAlert(kind = 'beep') {
            if (!this.audioEnabled) return;
            try {
                // Prefer audio file if present (more pleasant timbre)
                if (this.audioElement && typeof this.audioElement.play === 'function') {
                    try { this.audioElement.volume = Math.max(0, Math.min(1, this.audioVolume || 0.45)); this.audioElement.currentTime = 0; this.audioElement.play().catch(() => { }); return; } catch (e) { /* fallback to tones */ }
                }
                // Support numeric importance: 1,2,3 -> play 1..3 soft notes
                if (typeof kind === 'number') {
                    this.playImportance(Math.max(1, Math.min(3, Math.floor(kind))));
                    return;
                }
                if (kind === 'beep') {
                    this.playTone(880, 0.05, 'sine');
                } else if (kind === 'notify') {
                    this.playImportance(1);
                } else if (kind === 'error') {
                    this.playImportance(3);
                } else {
                    this.playImportance(1);
                }
            } catch (e) { /* ignore */ }
        }

        playImportance(level = 1) {
            try {
                const notes = {
                    1: [880],
                    2: [740, 880],
                    3: [660, 880, 1050]
                }[level] || [880];
                const ctx = this.ensureAudioContext();
                if (!ctx) return;
                const start = ctx.currentTime;
                const step = 0.08; // short stagger
                notes.forEach((freq, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.type = 'sine';
                    o.frequency.setValueAtTime(freq, start + i * step);
                    // soft envelope
                    g.gain.setValueAtTime(0, start + i * step);
                    g.gain.linearRampToValueAtTime(Math.max(0, Math.min(0.6, this.audioVolume || 0.45)), start + i * step + 0.01);
                    g.gain.linearRampToValueAtTime(0.0001, start + i * step + 0.18);
                    o.connect(g); g.connect(ctx.destination);
                    o.start(start + i * step);
                    o.stop(start + i * step + 0.2);
                });
            } catch (e) { /* ignore */ }
        }
    }

    // expose singleton
    try {
        window.FlowingAudio = window.FlowingAudio || new FlowingAudio();
        // Attach controls on DOM ready
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(() => window.FlowingAudio.attachControls(), 0);
        } else {
            document.addEventListener('DOMContentLoaded', () => window.FlowingAudio.attachControls());
        }
    } catch (e) { console.warn('Could not init FlowingAudio', e); }
})();
