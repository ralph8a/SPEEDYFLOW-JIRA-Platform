// ESLint configuration for modern JS (ES2020+)
module.exports = {
    root: true,
    env: {
        browser: true,
        es2020: true,
        node: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
    },
    rules: {
        // Puedes personalizar reglas aquí
    }
};
