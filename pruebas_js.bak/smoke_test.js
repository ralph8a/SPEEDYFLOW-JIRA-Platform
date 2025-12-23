// Smoke test para central_modules.js
import * as Central from '../central_modules.js';

function runSmokeTest() {
    let passed = 0, failed = 0;
    // Prueba de clases exportadas
    try {
        if (typeof Central.BackgroundSelectorUI === 'function') passed++;
        else throw new Error('BackgroundSelectorUI no exportado');
    } catch (e) { console.error(e); failed++; }

    // Prueba de funciones exportadas (si existen)
    try {
        if (typeof Central.getStatusDisplayName_app === 'function') passed++;
        else throw new Error('getStatusDisplayName_app no exportado');
    } catch (e) { console.error(e); failed++; }

    // Puedes agregar más pruebas según tus exportaciones reales

    console.log(`Smoke test: ${passed} pasaron, ${failed} fallaron.`);
    if (failed === 0) {
        console.log('✅ central_modules.js listo para producción');
    } else {
        console.log('❌ central_modules.js tiene problemas de exportación');
    }
}

runSmokeTest();
