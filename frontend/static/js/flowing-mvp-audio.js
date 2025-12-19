/* Flowing MVP - Audio utilities (separate file)
   Provides simple WebAudio-based alerts and UI control binding.
*/
(function () {
    class FlowingAudio {
        constructor() {
            this.audioCtx = null;
            this.audioEnabled = localStorage.getItem('flowing_sound_enabled') !== '0';
            this.audioVolume = parseFloat(localStorage.getItem('flowing_sound_volume') || '0.6');
            // auto-init when script loads
            this._ready = false;
        }

        attachControls() {
            try {
                // Try multiple selectors: app settings toggle may be in header 'ajustes'
                const soundBtn = document.getElementById('flowingSoundBtn') || document.getElementById('settingsSoundBtn') || document.querySelector('[data-sound-toggle]') || document.querySelector('.settings-sound');
                const soundVol = document.getElementById('flowingSoundVol');
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
                }).catch(()=>{});
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
                    try { this.audioElement.volume = Math.max(0, Math.min(1, this.audioVolume || 0.6)); this.audioElement.currentTime = 0; this.audioElement.play().catch(()=>{}); return; } catch(e) { /* fallback to tones */ }
                }
                if (kind === 'beep') {
                    this.playTone(880, 0.06, 'sine');
                } else if (kind === 'notify') {
                    this.playTone(880, 0.06, 'sine');
                    setTimeout(() => this.playTone(1320, 0.08, 'sine'), 110);
                } else if (kind === 'error') {
                    this.playTone(220, 0.12, 'sawtooth');
                } else {
                    this.playTone(660, 0.07, 'sine');
                }
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
