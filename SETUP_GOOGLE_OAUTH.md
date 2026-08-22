# Configuración de Google OAuth — Guía Paso a Paso

## Lo que ya está listo ✅

- **Frontend**: Botones "Continuar con Google" y "Registrarme con Google" en los 3 archivos HTML
- **auth.js**: Función `loginWithGoogle()` que llama a Supabase OAuth
- **Edge Function**: `supabase/functions/auth-google/index.ts` — sincroniza usuario post-OAuth
- **Migración SQL**: `supabase/migrations/20260821_google_oauth.sql` — tablas, triggers, funciones

---

## Lo que falta configurar (tú haces esto)

### Paso 1: Crear proyecto en Google Cloud Console

1. Ve a https://console.cloud.google.com
2. Crea un nuevo proyecto: **"SISTEPARD OAuth"**
3. Selecciona el proyecto

### Paso 2: Configurar pantallade consentimiento OAuth

1. Ve a **APIs & Services > OAuth consent screen**
2. Selecciona **External** (para usuarios externos)
3. Completa:
   - App name: `SISTEPARD`
   - User support email: tu email
   - Developer contact: tu email
4. En **Scopes**, agrega:
   - `email`
   - `profile`
   - `openid`
5. Guarda

### Paso 3: Crear credenciales OAuth

1. Ve a **APIs & Services > Credentials**
2. Click **+ Create Credentials > OAuth client ID**
3. Application type: **Web application**
4. Name: `SISTEPARD Web`
5. Authorized redirect URIs, agrega:
   ```
   https://ilivjaiexfqpioqrozlf.supabase.co/auth/v1/callback
   ```
6. Click **Create**
7. **COPIA** el Client ID y Client Secret

### Paso 4: Configurar en Supabase Dashboard

1. Ve a https://supabase.com/dashboard/project/ilivjaiexfqpioqrozlf/auth/providers
2. Activa **Google**
3. Pega:
   - **Client ID** (del Paso 3)
   - **Client Secret** (del Paso 3)
4. Guarda

### Paso 5: Configurar URLs en Supabase

1. Ve a **Authentication > URL Configuration**
2. Site URL:
   ```
   https://joshgritz.github.io/sistepard/
   ```
3. Redirect URLs (agrega):
   ```
   https://joshgritz.github.io/sistepard/
   http://localhost:3000/
   http://localhost:5500/
   ```

### Paso 6: Ejecutar migración SQL

En tu dashboard de Supabase:
1. Ve a **SQL Editor**
2. Pega el contenido de `supabase/migrations/20260821_google_oauth.sql`
3. Click **Run**

### Paso 7: Desplegar Edge Function

```bash
cd prm-valverde
supabase functions deploy auth-google
```

---

## Prueba

1. Abre `index.html` en tu navegador
2. Click "Iniciar Sesión"
3. Click "Continuar con Google"
4. Deberías ser redirigido a Google para autenticarte
5. Al volver, deberías estar logueado

---

## Troubleshooting

**Error "redirect_uri_mismatch"**
- Verifica que el redirect URI en Google Cloud Console coincida exactamente con el de Supabase

**Error "Access blocked"**
- En Google Cloud Console, ve a OAuth consent screen > Publishing status
- Click **Publish App** (a menos que quieras usar solo usuarios de prueba)

**El usuario no se sincroniza**
- Verifica que la migración SQL se ejecutó correctamente
- Revisa los logs de la Edge Function en Supabase Dashboard > Edge Functions > auth-google > Logs
