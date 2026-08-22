# 🗳️ SISTEPARD

**Sistema Electoral de Partidos RD** — Plataforma digital para la gestión electoral interna de partidos políticos en República Dominicana.

**Demo:** [joshgritz.github.io/sistepard](https://joshgritz.github.io/sistepard/) · **Estado:** En producción (provincia Valverde)

---

## ¿Qué es?

SISTEPARD digitaliza el proceso de elecciones internas de un partido político:

- **Inscripción de planchas** para organismos internos (Comités Zonales, Municipales, etc.)
- **Validación estatutaria automática y en tiempo real:**
  - Cuota de género 40%–60% (Art. 155 Estatutos PRM)
  - Cuota de juventud mínimo 10%, 18–35 años (Art. 154)
  - Militancia mínima de 3 años (Art. 151)
- **Inteligencia electoral** — búsqueda en el padrón oficial con foto real del militante
- **Control de acceso por jerarquía territorial** — cada candidato ve solo su nivel:
  Senador → provincia · Diputado → circunscripción · Alcalde → municipio · Regidor → zona
- **Actas oficiales** — generación y verificación pública de actas con código verificable
- **Multi-cliente** — cada partido/instancia se despliega con su propia config, branding y base de datos

## Módulos

| Página | Descripción |
|---|---|
| `sistema-inicio.html` | Login y acceso al sistema |
| `dirigentes.html` | Portal del dirigente: estructuras, apoyos, comités de base |
| `candidato.html` | Panel del candidato: estadísticas y estructura territorial |
| `geografia.html` | Mapa político-territorial: zonas, recintos, colegios |
| `legisladores.html` | Gestión de candidatos a cargos legislativos |
| `zonas.html` / `panel_zona.html` | Administración de zonas electorales |
| `delegados.html` | Registro y asignación de delegados |
| `admin.html` | Administración del sistema y generación de actas |
| `verificar-acta.html` | Verificación pública de autenticidad de actas |
| `importador_padron.html` | Importación del padrón PDF con extracción de fotos |

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│ Frontend: HTML5 + Tailwind CSS + JavaScript vanilla │
│           (GitHub Pages, sin build step)            │
│                                                     │
│ Backend: Supabase                                   │
│   ├─ PostgreSQL + RLS (row level security)          │
│   ├─ Auth (email/PIN + Google OAuth)                │
│   ├─ Storage (fotos del padrón, privado)            │
│   └─ Edge Functions (Deno): auth-login,             │
│      auth-register, auth-change-pin, auth-google,   │
│      sync-claims, register-dirigente...             │
│                                                     │
│ En progreso: frontend/ → migración a Next.js        │
└─────────────────────────────────────────────────────┘
```

**Decisiones clave:**

- **Sin framework en producción**: el sistema corre como archivos estáticos en GitHub Pages. Cero build, cero instalación, funciona offline.
- **Auth server-side**: las Edge Functions manejan login/PIN/OAuth con CORS restrictivo; el cliente nunca toca credenciales sensibles.
- **Config por instancia**: `js/supabase_config.js` (URL + anon key) y `clients/<id>/config.json` (branding, legal, territorio) permiten replicar el sistema para otro partido sin tocar código.
- **Extracción de fotos en el navegador**: PDF.js renderiza el padrón oficial a canvas y recorta las fotos por coordenadas — 100% local, nada sale a internet.

## Estructura del repositorio

```
├── *.html                  # Módulos del sistema (portal)
├── js/                     # JS compartido (config, auth, fotos)
├── admin/                  # Scripts de aprovisionamiento de instancias
├── clients/<id>/           # Configuración multi-cliente (por instancia)
├── supabase/
│   ├── functions/          # Edge Functions (Deno)
│   └── migrations/         # Migraciones SQL
├── estructura_db.sql       # Esquema completo + datos semilla
└── frontend/               # Migración Next.js (WIP)
```

## Puesta en marcha (nueva instancia)

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar `estructura_db.sql` en el SQL Editor
3. Configurar URL + anon key en `js/supabase_config.js`
4. Ajustar `clients/mi-partido/config.json` (branding, cuotas legales, territorio)
5. Para los scripts de `admin/`, definir variables de entorno:

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "tu_service_key"
$env:SUPABASE_DB_CONN = "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
```

## Seguridad

- RLS habilitado en todas las tablas; vistas con `security_invoker = on`
- Service role key y contraseña de BD **solo por variables de entorno**, nunca en el código
- Fotos del padrón en bucket privado con políticas por rol
- Auditoría de actividad (`log_actividad`) sobre operaciones sensibles

## Licencia

[MIT](LICENSE)
