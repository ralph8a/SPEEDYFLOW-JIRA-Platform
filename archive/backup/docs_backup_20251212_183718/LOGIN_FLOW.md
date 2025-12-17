# 🔐 SpeedyFlow Login & Initial Filters Flow
## Flujo de Autenticación y Filtros Iniciales
### 1. Primera Vez - Login Modal
Cuando el usuario entra por primera vez (sin credenciales en `.env`):
```
App Start → Check /api/user/login-status → needs_login: true → Show Login Modal
```
#### Login Modal Features
**Campos Requeridos:**
- ✅ JIRA Site URL (ej: `https://speedymovil.atlassian.net`)
- ✅ Email (ej: `rafael.hernandez@speedymovil.com`)
- ✅ API Token (con guía expandible)
**Campos Opcionales:**
- ⚠️ Project Key (ej: `MSM`, `AP`, `IT`)
  - **NOTA IMPORTANTE**: El Project Key debe ser exacto
  - Un nombre incorrecto puede generar inconsistencias en la detección de colas
**Guía de Token (Expandible):**
```
¿No sabes cómo obtener tu token de JIRA? Click para ver la guía
📖 Cómo generar tu API Token
1. Ve a https://id.atlassian.com/manage-profile/security/api-tokens
2. Haz click en "Create API token"
3. Dale un nombre al token (ej: "SpeedyFlow")
4. Copia el token generado
5. Pégalo en el campo de arriba ☝️
⚠️ IMPORTANTE: Guarda el token en un lugar seguro.
No podrás verlo de nuevo después de cerrarlo.
```
### 2. Guardado de Credenciales
Al hacer clic en "🔐 Guardar mis Credenciales":
```javascript
POST /api/user/login
{
  "jira_site": "https://speedymovil.atlassian.net",
  "jira_email": "user@company.com",
  "jira_token": "ATATT3xFfGF0...",
  "project_key": "MSM"  // Opcional
}
```
**Ubicaciones de Guardado:**
1. `.env` (raíz del proyecto)
   ```env
   JIRA_CLOUD_SITE=https://speedymovil.atlassian.net
   JIRA_EMAIL=user@company.com
   JIRA_API_TOKEN=ATATT3xFfGF0...
   USER_PROJECT_KEY=MSM
   ```
2. `~/Documents/SpeedyFlow/credentials.env` (respaldo)
   - Se crea automáticamente
   - Mismo formato que `.env`
   - Útil para recuperación de credenciales
### 3. Trigger de Filtros Iniciales
Después de guardar credenciales exitosamente:
```javascript
// Guardar flags en sessionStorage
sessionStorage.setItem('speedyflow_just_logged_in', 'true');
sessionStorage.setItem('speedyflow_initial_project', projectKey); // Si existe
// Recargar aplicación
window.location.reload();
```
**Al recargar, app.js detecta el flag:**
```javascript
async function checkAndApplyInitialFilters() {
  // 1. Detectar login reciente
  if (sessionStorage.getItem('speedyflow_just_logged_in') === 'true') {
    // 2. Buscar desk por Project Key o usar primero disponible
    const targetDesk = findDeskByProjectKey(initialProject) || state.desks[0];
    // 3. Auto-seleccionar desk en filtro
    deskSelect.value = targetDesk.id;
    deskSelect.dispatchEvent(new Event('change'));
    // 4. Esperar carga de queues
    await wait(1500);
    // 5. Buscar queue "Assigned to me" / "Asignado a mi"
    const targetQueue = findQueueByPattern([
      /assigned.*to.*me/i,
      /asignado.*a.*mi/i,
      /mis.*ticket/i,
      /my.*ticket/i,
      /open.*by.*me/i,
      /abierto.*por.*mi/i
    ]);
    // 6. Auto-seleccionar queue
    queueSelect.value = targetQueue.value;
    queueSelect.dispatchEvent(new Event('change'));
    // 7. Mostrar notificación de éxito
    notificationPanel.show('🎯 Filtros iniciales aplicados', 'success');
  }
}
```
### 4. Patrones de Queue Detectados
El sistema busca automáticamente queues con estos nombres:
| Patrón | Ejemplo |
|--------|---------|
| `assigned.*to.*me` | "Assigned to me", "Tickets assigned to me" |
| `asignado.*a.*mi` | "Asignado a mi", "Tickets asignados a mi" |
| `mis.*ticket` | "Mis tickets", "Mis tickets abiertos" |
| `my.*ticket` | "My tickets", "My open tickets" |
**Si no encuentra ninguno:** Usa la primera queue disponible (index 1).
### 5. Resultado Final
Después del login exitoso:
```
✅ Credenciales guardadas en .env
✅ Backup en ~/Documents/SpeedyFlow/
✅ Desk auto-seleccionado (por Project Key o primero disponible)
✅ Queue "Assigned to me" auto-seleccionada
✅ Tickets cargados automáticamente
✅ Vista optimizada según cantidad de tickets
```
## Backend Endpoints
### GET `/api/user/login-status`
**Response:**
```json
{
  "data": {
    "needs_login": false,
    "has_site": true,
    "has_email": true,
    "has_token": true,
    "project_key": "MSM"
  }
}
```
### POST `/api/user/login`
**Request:**
```json
{
  "jira_site": "https://speedymovil.atlassian.net",
  "jira_email": "user@company.com",
  "jira_token": "ATATT3xFfGF0...",
  "project_key": "MSM"
}
```
**Response:**
```json
{
  "data": {
    "success": true,
    "message": "Credentials saved successfully",
    "saved_to": [".env", "~/Documents/SpeedyFlow/credentials.env"],
    "reload_required": true
  }
}
```
## Archivos Modificados
### Frontend
- `frontend/static/js/user-setup-modal.js` - Login modal con guía de token
- `frontend/static/css/user-setup-modal.css` - Estilos del modal y nota de advertencia
- `frontend/static/js/app.js` - Función `checkAndApplyInitialFilters()`
- `frontend/static/img/speedyflow-logo.svg` - Logo con branding
### Backend
- `api/server.py` - Endpoints `/api/user/login-status` y `/api/user/login`
- `utils/config.py` - `save_user_credentials()`, `needs_login()`
## Notas Importantes
⚠️ **Project Key Exactitud:**
- El Project Key debe coincidir exactamente con el proyecto en JIRA
- Ejemplo correcto: `MSM` (3 letras mayúsculas)
- Incorrecto: `msm`, `MSM-`, `ms`
- Un Project Key incorrecto puede causar:
  - Queues no detectadas correctamente
  - Filtros que no funcionan
  - Tickets que no se cargan
🔐 **Seguridad de Token:**
- El API Token se almacena en texto plano en `.env`
- **NO** subir `.env` a git (ya está en `.gitignore`)
- Usar permisos restrictivos en `~/Documents/SpeedyFlow/` (solo usuario)
- El token da acceso completo a JIRA - tratarlo como password
📁 **Respaldo Automático:**
- Las credenciales se guardan automáticamente en `~/Documents/SpeedyFlow/`
- Si se pierde `.env`, se puede recuperar de ahí
- Útil para reinstalaciones o cambios de workspace
## Testing
**Probar el flujo completo:**
1. Eliminar `.env` del proyecto
2. Recargar la aplicación
3. Debe aparecer el login modal
4. Ingresar credenciales válidas
5. Ingresar Project Key (ej: `MSM`)
6. Click en "🔐 Guardar mis Credenciales"
7. Verificar que:
   - `.env` se creó con las credenciales
   - `~/Documents/SpeedyFlow/credentials.env` existe
   - App recarga automáticamente
   - Desk se selecciona automáticamente
   - Queue "Assigned to me" se selecciona
   - Tickets se cargan
**Verificar archivos:**
```bash
# Verificar .env
cat .env
# Verificar backup
cat ~/Documents/SpeedyFlow/credentials.env
# Ambos deben tener:
# JIRA_CLOUD_SITE=...
# JIRA_EMAIL=...
# JIRA_API_TOKEN=...
# USER_PROJECT_KEY=MSM
```
---
**Última actualización:** Diciembre 7, 2025
**Estado:** ✅ Implementado y funcional
