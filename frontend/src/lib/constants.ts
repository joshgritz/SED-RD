export const MUNICIPIOS = [
  {
    name: "Mao",
    distritos: 6,
    electores: 62712,
    recintos: 41,
    colegios: 133,
    zones: ["Zona A", "Zona B", "Zona C", "Zona D", "Zona E", "Zona F"],
    gradient: "from-accent to-accent-light",
    dotColor: "bg-accent",
  },
  {
    name: "Esperanza",
    distritos: 3,
    electores: 46347,
    recintos: 25,
    colegios: 101,
    zones: ["Zona G", "Zona H", "Zona I", "Zona J", "Zona K"],
    gradient: "from-gold to-gold-light",
    dotColor: "bg-gold",
  },
  {
    name: "Laguna Salada",
    distritos: 1,
    electores: 17144,
    recintos: 14,
    colegios: 37,
    zones: ["Zona L", "Zona M", "Zona N", "Zona O"],
    gradient: "from-emerald-500 to-emerald-400",
    dotColor: "bg-emerald-500",
  },
] as const;

export const FEATURES = [
  {
    id: "rls",
    title: "Row Level Security",
    description: "Cada usuario solo ve los datos que le corresponden. Aislamiento total a nivel de base de datos.",
    icon: "shield",
  },
  {
    id: "jwt",
    title: "Autenticación JWT",
    description: "Sesiones seguras con tokens JWT y refresh automático. Control de acceso por roles y permisos.",
    icon: "key",
  },
  {
    id: "audit",
    title: "Auditoría Completa",
    description: "Registro inmutable de cada acción realizada en el sistema. Trazabilidad total para rendición de cuentas.",
    icon: "clipboard",
  },
  {
    id: "encryption",
    title: "Datos Cifrados",
    description: "Información sensible protegida con cifrado en reposo y en tránsito. Cumplimiento de estándares.",
    icon: "lock",
  },
] as const;

export const STATS = [
  { value: 156, label: "Representantes Activos", suffix: "+" },
  { value: 22, label: "Zonas Cubiertas", suffix: "" },
  { value: 98, label: "Satisfacción", suffix: "%" },
  { value: 24, label: "Disponibilidad", suffix: "/7" },
] as const;
