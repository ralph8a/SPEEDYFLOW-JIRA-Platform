// contextStore.js
// Store reactiva para cambios de contexto en FlowingFooter

export class ContextStore {
    constructor(initialContext = {}) {
        this.state = { ...initialContext };
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    setState(newState) {
        const prev = { ...this.state };
        this.state = { ...this.state, ...newState };
        if (JSON.stringify(prev) !== JSON.stringify(this.state)) {
            this.listeners.forEach(l => l(this.state, prev));
        }
    }

    getState() {
        return { ...this.state };
    }
}

// Para browser global
if (typeof window !== 'undefined') {
    window.ContextStore = ContextStore;
}
