// performanceUtils.js
// Utilidades para optimización de rendimiento (debounce, throttle, animationFrame)

/**
 * Debounce: ejecuta la función después de que no se haya llamado por X ms.
 */
export function debounce(fn, wait = 200) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), wait);
    };
}

/**
 * Throttle: ejecuta la función como máximo una vez cada X ms.
 */
export function throttle(fn, limit = 200) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Ejecuta una función en el próximo frame de animación.
 */
export function raf(fn) {
    return (...args) => requestAnimationFrame(() => fn.apply(this, args));
}

// Para browser global
if (typeof window !== 'undefined') {
    window.performanceUtils = { debounce, throttle, raf };
}
