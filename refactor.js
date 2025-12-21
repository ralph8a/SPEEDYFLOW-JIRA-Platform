const crypto = require('crypto');
// Utilidad para obtener hash de un nodo AST (función, clase, variable)
function getNodeHash(node) {
    // Serializa el nodo ignorando el nombre para detectar duplicados reales
    let clone = JSON.parse(JSON.stringify(node));
    if (clone.id) clone.id.name = '';
    if (clone.key) clone.key.name = '';
    return crypto.createHash('md5').update(JSON.stringify(clone)).digest('hex');
}
// Acumuladores de hashes globales
let functionHashMap = new Map(); // hash -> { node, name, files: [] }
let classHashMap = new Map();
let variableHashMap = new Map();
// refactor.js
// Refactoriza: renombra todas las variables 'foo' a 'bar' en un archivo JS

const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
    console.error('Uso: node refactor.js <archivo.js | carpeta>');
    process.exit(1);
}

const inputPath = process.argv[2];

// Recursivamente obtener todos los archivos .js
function getAllJsFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllJsFiles(filePath));
        } else if (file.endsWith('.js')) {
            results.push(filePath);
        }
    });
    return results;
}

let filesToProcess = [];
if (fs.statSync(inputPath).isDirectory()) {
    filesToProcess = getAllJsFiles(inputPath);
} else {
    filesToProcess = [inputPath];
}

// Acumuladores globales
let allClasses = [];
let allFunctions = [];
let allVariables = [];

filesToProcess.forEach(filename => {
    // Clonar AST original para comparar después
    const deepClone = obj => JSON.parse(JSON.stringify(obj));
    const code = fs.readFileSync(filename, 'utf8');
    // Usar Babel parser para soportar sintaxis moderna
    const ast = parser.parse(code, {
        sourceType: 'unambiguous',
        plugins: [
            'optionalChaining',
            'nullishCoalescingOperator',
            'classProperties',
            'objectRestSpread',
            'dynamicImport',
            'jsx',
            'typescript',
        ]
    });
    const astOriginal = deepClone(ast);

    // Arrays para recolectar clases, funciones y variables (con rutas)
    const classNames = [];
    const functionPaths = [];
    const variablePaths = [];

    function normalizeName(name) {
        return name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_]/g, '');
    }
    function getPath(stack) {
        let path = [];
        for (let i = 1; i < stack.length; i++) {
            const n = stack[i];
            if ((n.type === 'ClassDeclaration' || n.type === 'FunctionDeclaration') && n.id && n.id.name) {
                path.push(normalizeName(n.id.name));
            }
            if (n.type === 'MethodDefinition' && n.key && n.key.name) {
                path.push(normalizeName(n.key.name));
            }
        }
        return path;
    }

    let parentStack = [];
    let importStatements = new Set();
    traverse(ast, {
        enter(path) {
            const node = path.node;
            parentStack.push(node);
            if (node.type === 'Identifier' && node.name === 'foo') {
                node.name = 'bar';
            }
            // Clases
            if (node.type === 'ClassDeclaration' && node.id && node.id.name && parentStack.length === 2) {
                classNames.push(normalizeName(node.id.name));
                // Hash para duplicados
                const hash = getNodeHash(node);
                if (classHashMap.has(hash) && classHashMap.get(hash).files.length > 1) {
                    importStatements.add(`const { ${normalizeName(node.id.name)} } = require('./reutilizables');`);
                    path.remove();
                    return;
                } else if (!classHashMap.has(hash)) {
                    classHashMap.set(hash, { node, name: normalizeName(node.id.name), files: [filename] });
                } else {
                    classHashMap.get(hash).files.push(filename);
                }
            }
            // Funciones
            if (node.type === 'FunctionDeclaration' && node.id && node.id.name) {
                const p = getPath(parentStack);
                if (p.length > 0) {
                    functionPaths.push(p.join('.'));
                }
                // Hash para duplicados
                const hash = getNodeHash(node);
                if (functionHashMap.has(hash) && functionHashMap.get(hash).files.length > 1) {
                    importStatements.add(`const { ${normalizeName(node.id.name)} } = require('./reutilizables');`);
                    path.remove();
                    return;
                } else if (!functionHashMap.has(hash)) {
                    functionHashMap.set(hash, { node, name: normalizeName(node.id.name), files: [filename] });
                } else {
                    functionHashMap.get(hash).files.push(filename);
                }
            }
            // Métodos de clase
            if (node.type === 'ClassMethod' && node.key && node.key.name) {
                const p = getPath(parentStack);
                if (p.length > 0) {
                    functionPaths.push(p.join('.'));
                }
                // Hash para duplicados
                const hash = getNodeHash(node);
                if (functionHashMap.has(hash) && functionHashMap.get(hash).files.length > 1) {
                    importStatements.add(`const { ${normalizeName(node.key.name)} } = require('./reutilizables');`);
                    path.remove();
                    return;
                } else if (!functionHashMap.has(hash)) {
                    functionHashMap.set(hash, { node, name: normalizeName(node.key.name), files: [filename] });
                } else {
                    functionHashMap.get(hash).files.push(filename);
                }
            }
            // Variables
            if (node.type === 'VariableDeclarator' && node.id && node.id.name) {
                const p = getPath(parentStack).concat([normalizeName(node.id.name)]);
                if (p.length > 0) {
                    variablePaths.push(p.join('.'));
                }
                // Hash para duplicados
                const hash = getNodeHash(node);
                if (variableHashMap.has(hash) && variableHashMap.get(hash).files.length > 1) {
                    importStatements.add(`const { ${normalizeName(node.id.name)} } = require('./reutilizables');`);
                    path.remove();
                    return;
                } else if (!variableHashMap.has(hash)) {
                    variableHashMap.set(hash, { node, name: normalizeName(node.id.name), files: [filename] });
                } else {
                    variableHashMap.get(hash).files.push(filename);
                }
            }
        },
        exit(path) {
            parentStack.pop();
        }
    });

    // Insertar imports al inicio si hay duplicados (ES6 si el archivo original lo usa)
    let newCode = generate(ast.program, { comments: true }).code;
    if (importStatements.size > 0) {
        if (/import |export /.test(code)) {
            newCode = Array.from(importStatements).map(s => {
                // Asegura que siempre haya llaves en import/export
                let fixed = s.replace('const ', 'import ')
                    .replace(/= require\(([^)]+)\);?/, 'from $1;')
                    .replace(/^import ([^\{])/, 'import { $1')
                    .replace(/\} = require/, '} from')
                    .replace(/;$/, ';');
                // Si falta llave de cierre
                if (!/\{.*\}/.test(fixed)) {
                    fixed = fixed.replace(/import ([^ ]+) from/, 'import { $1 } from');
                }
                return fixed;
            }).join('\n') + '\n' + newCode;
        } else {
            // Para require, asegura llaves
            newCode = Array.from(importStatements).map(s => {
                if (!/\{.*\}/.test(s)) {
                    return s.replace('const ', 'const { ') + ' }';
                }
                return s;
            }).join('\n') + '\n' + newCode;
        }
    }

    // Generar reutilizables.js con ES6 export y comentarios/JSDoc
    let reutilizablesCode = '';
    let exportNames = [];
    functionHashMap.forEach((obj, hash) => {
        if (obj.files.length > 1) {
            if (obj.node.leadingComments) {
                obj.node.leadingComments.forEach(c => {
                    reutilizablesCode += `/*${c.value}*/\n`;
                });
            }
            reutilizablesCode += generate(obj.node, { comments: true }).code + '\n';
            exportNames.push(obj.name);
        }
    });
    classHashMap.forEach((obj, hash) => {
        if (obj.files.length > 1) {
            if (obj.node.leadingComments) {
                obj.node.leadingComments.forEach(c => {
                    reutilizablesCode += `/*${c.value}*/\n`;
                });
            }
            reutilizablesCode += generate(obj.node, { comments: true }).code + '\n';
            exportNames.push(obj.name);
        }
    });
    variableHashMap.forEach((obj, hash) => {
        if (obj.files.length > 1) {
            if (obj.node.leadingComments) {
                obj.node.leadingComments.forEach(c => {
                    reutilizablesCode += `/*${c.value}*/\n`;
                });
            }
            let decl = obj.node.kind || 'let';
            reutilizablesCode += `${decl} ${obj.name} = ${generate(obj.node.init, { comments: true }).code};\n`;
            exportNames.push(obj.name);
        }
    });
    if (reutilizablesCode) {
        reutilizablesCode += `\nexport { ${exportNames.join(', ')} };\n`;
        fs.writeFileSync('reutilizables.js', reutilizablesCode);
        console.log('Archivo reutilizables.js generado con duplicados.');
    }

    const refactoredFile = filename.replace(/\.js$/, '.refactored.js');
    let wroteRefactored = false;
    // Solo escribir .refactored.js si el AST fue modificado estructuralmente
    const astMod = deepClone(ast);
    // Ignorar diferencias en comentarios y formato
    function stripAstMeta(obj) {
        if (Array.isArray(obj)) return obj.map(stripAstMeta);
        if (obj && typeof obj === 'object') {
            const o = {};
            for (const k in obj) {
                if (["start", "end", "loc", "leadingComments", "trailingComments", "innerComments", "extra"].includes(k)) continue;
                o[k] = stripAstMeta(obj[k]);
            }
            return o;
        }
        return obj;
    }
    const astA = stripAstMeta(astOriginal);
    const astB = stripAstMeta(astMod);
    if (JSON.stringify(astA) !== JSON.stringify(astB)) {
        fs.writeFileSync(refactoredFile, newCode);
        wroteRefactored = true;
    }

    // Eliminar duplicados y vacíos locales
    const uniqueClasses = [...new Set(classNames)].filter(Boolean);
    const uniqueFunctions = [...new Set(functionPaths)].filter(Boolean);
    const uniqueVariables = [...new Set(variablePaths)].filter(Boolean);

    // Guardar referencia al archivo real exportable
    const exportFile = wroteRefactored ? refactoredFile : filename;
    allClasses = allClasses.concat(uniqueClasses.map(c => ({ name: c, file: exportFile })));
    allFunctions = allFunctions.concat(uniqueFunctions.map(f => ({ path: f, file: exportFile })));
    allVariables = allVariables.concat(uniqueVariables.map(v => ({ path: v, file: exportFile })));
    // Borrar .refactored.js innecesarios (sin cambios)
    const glob = require('glob');
    glob.sync('pruebas_js/**/*.refactored.js').forEach(f => {
        // Si no está en allClasses, allFunctions, allVariables, bórralo
        const isUsed = allClasses.concat(allFunctions).concat(allVariables).some(obj => obj.file === f);
        if (!isUsed) {
            fs.unlinkSync(f);
        }
    });
});

// Unificar y eliminar duplicados globales
const globalClassMap = new Map();
allClasses.forEach(obj => globalClassMap.set(obj.name + '|' + obj.file, obj));
const globalFunctionMap = new Map();
allFunctions.forEach(obj => globalFunctionMap.set(obj.path + '|' + obj.file, obj));
const globalVariableMap = new Map();
allVariables.forEach(obj => globalVariableMap.set(obj.path + '|' + obj.file, obj));


let exportLines = [];
// Exportar clases
if (globalClassMap.size > 0) {
    exportLines.push('// Exportación de clases');
    globalClassMap.forEach(obj => {
        let isDup = false;
        classHashMap.forEach((v, k) => {
            if (v.name === obj.name && v.files.length > 1) isDup = true;
        });
        let exportFile = obj.file;
        // Si es .refactored.js pero no existe, usar el original
        if (exportFile.endsWith('.refactored.js') && !fs.existsSync(exportFile)) {
            exportFile = exportFile.replace(/\.refactored\.js$/, '.js');
        }
        if (isDup) {
            exportLines.push(`import { ${obj.name} as _${obj.name}_reutilizable } from './reutilizables.js';`);
            exportLines.push(`export const ${obj.name} = _${obj.name}_reutilizable;`);
        } else {
            const importPath = './' + path.relative(process.cwd(), exportFile).replace(/\\/g, '/');
            exportLines.push(`import * as _pkg_${obj.name} from '${importPath}';`);
            exportLines.push(`export const ${obj.name} = _pkg_${obj.name}.${obj.name};`);
        }
    });
}
if (globalFunctionMap.size > 0) {
    exportLines.push('// Exportación de funciones (arrow a ruta)');
    globalFunctionMap.forEach(obj => {
        let isDup = false;
        functionHashMap.forEach((v, k) => {
            if (v.name && obj.path.endsWith(v.name) && v.files.length > 1) isDup = true;
        });
        let exportFile = obj.file;
        if (exportFile.endsWith('.refactored.js') && !fs.existsSync(exportFile)) {
            exportFile = exportFile.replace(/\.refactored\.js$/, '.js');
        }
        let fnName = obj.path.split('.').join('_') + '_' + (isDup ? 'reutilizables' : path.basename(exportFile, '.js'));
        // Eliminar sufijo .refactored de los nombres exportados y normalizar identificador
        fnName = fnName.replace(/_refactored$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
        // Propiedad exportada: usar solo el último segmento válido del path
        let propName = obj.path.split('.').filter(Boolean).pop() || fnName;
        propName = propName.replace(/[^a-zA-Z0-9_]/g, '_');
        if (isDup) {
            exportLines.push(`import { ${propName} as _${fnName} } from './reutilizables.js';`);
            exportLines.push(`export const ${fnName} = (...args) => _${fnName}(...args);`);
        } else {
            exportLines.push(`export const ${fnName} = (...args) => require('./${path.relative(process.cwd(), exportFile).replace(/\\/g, '/')}').${propName}(...args);`);
        }
    });
}
if (globalVariableMap.size > 0) {
    exportLines.push('// Exportación de variables (arrow a ruta)');
    globalVariableMap.forEach(obj => {
        let isDup = false;
        variableHashMap.forEach((v, k) => {
            if (v.name && obj.path.endsWith(v.name) && v.files.length > 1) isDup = true;
        });
        let exportFile = obj.file;
        if (exportFile.endsWith('.refactored.js') && !fs.existsSync(exportFile)) {
            exportFile = exportFile.replace(/\.refactored\.js$/, '.js');
        }
        let varName = obj.path.split('.').join('_') + '_' + (isDup ? 'reutilizables' : path.basename(exportFile, '.js'));
        varName = varName.replace(/_refactored$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
        let varProp = obj.path.split('.').filter(Boolean).pop() || varName;
        varProp = varProp.replace(/[^a-zA-Z0-9_]/g, '_');
        if (isDup) {
            exportLines.push(`import { ${varProp} as _${varName} } from './reutilizables.js';`);
            exportLines.push(`export const ${varName} = () => _${varName};`);
        } else {
            exportLines.push(`export const ${varName} = () => require('./${path.relative(process.cwd(), exportFile).replace(/\\/g, '/')}').${varProp};`);
        }
    });
}
// Generar reporte JSON de cambios y mostrar en terminal
const duplicados = {
    funciones: Array.from(functionHashMap.values()).filter(x => x.files.length > 1).map(x => ({ nombre: x.name, archivos: x.files })),
    clases: Array.from(classHashMap.values()).filter(x => x.files.length > 1).map(x => ({ nombre: x.name, archivos: x.files })),
    variables: Array.from(variableHashMap.values()).filter(x => x.files.length > 1).map(x => ({ nombre: x.name, archivos: x.files })),
};
const report = {
    duplicados,
    fecha: new Date().toISOString()
};
fs.writeFileSync('refactor_report.json', JSON.stringify(report, null, 2));
console.log('Reporte de duplicados generado en refactor_report.json');
if (duplicados.funciones.length || duplicados.clases.length || duplicados.variables.length) {
    console.log('Duplicados detectados:');
    if (duplicados.funciones.length) {
        console.log('Funciones:');
        duplicados.funciones.forEach(f => console.log(`  - ${f.nombre}: ${f.archivos.join(', ')}`));
    }
    if (duplicados.clases.length) {
        console.log('Clases:');
        duplicados.clases.forEach(c => console.log(`  - ${c.nombre}: ${c.archivos.join(', ')}`));
    }
    if (duplicados.variables.length) {
        console.log('Variables:');
        duplicados.variables.forEach(v => console.log(`  - ${v.nombre}: ${v.archivos.join(', ')}`));
    }
} else {
    console.log('No se detectaron duplicados en funciones, clases o variables.');
}
if (exportLines.length > 0) {
    fs.writeFileSync('central_modules.js', exportLines.join('\n') + '\n');
    console.log('Archivo central_modules.js generado con las exportaciones.');
} else {
    console.log('No se encontraron clases, funciones o variables para exportar.');
}

console.log('Refactorización completada para todos los archivos.');
