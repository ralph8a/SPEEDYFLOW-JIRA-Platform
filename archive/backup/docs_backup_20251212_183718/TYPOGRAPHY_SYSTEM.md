# 🎨 SPEEDYFLOW Typography System Guide
## Sistema Coherente y Cohesivo: Aptos + Century
### 📋 **Filosofía del Sistema**
**Aptos Family (Sans-Serif)**
- ✅ **UI e Interacción**: Navegación, botones, formularios, badges
- ✅ **Modernidad**: Encabezados, títulos, interfaces dinámicas  
- ✅ **Claridad**: Elementos que requieren lectura rápida y reconocimiento
**Century Family (Serif)**
- ✅ **Contenido Editorial**: Párrafos, descripciones, artículos
- ✅ **Profesionalismo**: Documentos, reportes, texto largo
- ✅ **Legibilidad**: Contenido que requiere lectura sostenida
---
### 🏗️ **Arquitectura de Fuentes**
```css
/* JERARQUÍA PRINCIPAL */
--font-ui:       'Aptos' + fallbacks          → Elementos de interfaz
--font-display:  'Aptos Display' + fallbacks  → Encabezados y títulos
--font-content:  'Century' + fallbacks        → Contenido editorial  
--font-mono:     'Aptos Mono' + fallbacks     → Código y monospace
/* ALIASES SEMÁNTICOS */
--font-heading:    var(--font-display)     → h1, h2, h3, h4, h5, h6
--font-body:       var(--font-content)     → p, .description, .article
--font-interface:  var(--font-ui)          → buttons, nav, forms
--font-code:       var(--font-mono)        → code, pre, .monospace
```
---
### 📐 **Escala Tipográfica**
```css
--text-xs:   12px  (0.75rem)   → Badges, meta info, captions
--text-sm:   13px  (0.8125rem) → Form labels, nav items  
--text-base: 14px  (0.875rem)  → Texto base de la aplicación
--text-md:   15px  (0.9375rem) → Contenido principal
--text-lg:   16px  (1rem)      → Subtítulos, lead text
--text-xl:   18px  (1.125rem)  → Títulos secundarios
--text-2xl:  20px  (1.25rem)   → Títulos principales
--text-3xl:  24px  (1.5rem)    → Encabezados importantes
--text-4xl:  30px  (1.875rem)  → Títulos de página
--text-5xl:  36px  (2.25rem)   → Títulos hero
```
---
### 🎯 **Aplicaciones Específicas**
#### **Issue Cards (Sistema Mixto)**
```css
.issue-title        → Aptos Display (impacto visual)
.issue-description  → Century (legibilidad)  
.issue-meta         → Aptos (claridad UI)
```
#### **Kanban Board**
```css
.kanban-column-title → Aptos Display (jerarquía visual)
.kanban-column-count → Aptos (información rápida)
```
#### **Modales y Diálogos**
```css
.modal-title → Aptos Display (atención)
.modal-body  → Century (lectura cómoda)
```
#### **Sidebar Navigation** 
```css
.sidebar-section-label → Aptos (UI consistente)
.sidebar-menu-item     → Aptos (navegación clara)
```
---
### 🌓 **Adaptación por Temas**
#### **Light Theme**
- **Century**: Font-weight normal (400) para suavidad
- **Aptos**: Peso estándar para claridad
#### **Dark Theme** 
- **Century**: Font-weight medium (500) + letter-spacing para definición
- **Aptos**: Pesos más definidos para contraste
---
### 🛠️ **Clases de Utilidad**
#### **Familias de Fuentes**
```css
.font-ui       → Aptos (interfaces)
.font-content  → Century (contenido)
.font-heading  → Aptos Display (títulos)
.font-mono     → Aptos Mono (código)
```
#### **Tamaños**
```css
.text-xs, .text-sm, .text-base, .text-md, 
.text-lg, .text-xl, .text-2xl, .text-3xl
```
#### **Pesos**
```css
.font-light, .font-normal, .font-medium,
.font-semibold, .font-bold, .font-extrabold
```
#### **Interlineado**
```css
.leading-tight, .leading-snug, .leading-normal,
.leading-relaxed, .leading-loose
```
---
### 📱 **Responsividad**
#### **Mobile (< 768px)**
- Tamaños base reducidos (13px base, 12px small)
- Issue titles más compactos
- Mejor legibilidad en pantallas pequeñas
#### **Desktop (> 1200px)**
- Tamaños base aumentados (15px base, 16px medium) 
- Mayor jerarquía visual
- Aprovechamiento del espacio disponible
---
### 🔧 **Comandos de Desarrollo**
```javascript
// Cambiar familia de fuente globalmente
document.documentElement.style.setProperty('--font-ui', 'Nueva-Fuente');
// Aplicar clase de utilidad
element.classList.add('font-content', 'text-lg', 'font-medium');
// Verificar variables computadas
getComputedStyle(document.documentElement).getPropertyValue('--font-heading');
```
---
### 📋 **Checklist de Implementación**
- ✅ **typography-system.css** creado y importado
- ✅ **fonts.css** actualizado con sistema cohesivo  
- ✅ **variables.css** sincronizado con nuevas variables
- ✅ **app.bundle.css** importa el sistema en orden correcto
- 🔄 **Componentes específicos** por actualizar según necesidad
- 🔄 **Testing** en diferentes navegadores y dispositivos
---
### 🎨 **Resultado Visual**
**Antes**: Tipografía inconsistente, solo Aptos en toda la aplicación
**Después**: Sistema cohesivo con:
- **Aptos**: UI moderna y consistente
- **Century**: Contenido legible y profesional  
- **Jerarquía clara**: Cada elemento con su fuente óptima
- **Escalabilidad**: Sistema flexible y extensible
---
*Última actualización: Diciembre 1, 2025*
*Mantenedor: Sistema de Design SPEEDYFLOW*
