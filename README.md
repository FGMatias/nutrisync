# NutriSync

  Sistema de gestión de distribución alimentaria escolar para la I.E. 8060. Permite
  administrar el inventario de productos, registrar ingresos de proveedores,
  planificar y ejecutar la distribución de alimentos a los alumnos mediante escaneo
  QR, y llevar trazabilidad completa de todos los movimientos de stock.

  ## Demo

  **URL:** https://nutrisync-psi.vercel.app

  ### Usuarios de prueba

  Todos los usuarios tienen la contraseña: `admin123`

  | Correo | Rol |
  |---|---|
  | `admin@ie8060.edu.pe` | Administrador |
  | `director@ie8060.edu.pe` | Director |
  | `cae@ie8060.edu.pe` | CAE |
  | `almacen@ie8060.edu.pe` | Personal de Almacén |
  | `docente@ie8060.edu.pe` | Docente |
  | `logistica@ie8060.edu.pe` | Operario Logístico |

  ## Tecnologías
  
  - **Frontend:** React 19 + Vite
  - **Backend / Base de datos:** Supabase (PostgreSQL con RLS)
  - **Estado del servidor:** TanStack Query v5
  - **Enrutamiento:** React Router v7
  - **Formularios y validación:** React Hook Form + Zod
  - **UI:** Radix UI + Tailwind CSS + Lucide React
  - **Offline:** Dexie (IndexedDB)
  - **Reportes:** jsPDF + xlsx
  - **Despliegue:** Vercel

  ## Funcionalidades  

  ### Por módulo
  | Módulo | Descripción | Roles |
  |---|---|---|
  | **Dashboard** | Resumen de stock, distribuciones y alertas del día | Admin,
  Director, CAE, Almacén |
  | **Proveedores** | CRUD de proveedores con datos de contacto | Admin, Almacén |
  | **Ingreso de Productos** | Registro de ingresos con detalle por lote, actas y
  checklists de recepción | Admin, Almacén |
  | **Inventario** | Vista del stock actual con alertas de mínimos y máximos |
  Admin, Director, CAE, Almacén |
  | **Ajustes de Stock** | Correcciones manuales de inventario (entradas y salidas)
  | Admin, Almacén |
  | **Alumnos** | CRUD de alumnos con generación de códigos QR individuales | Admin,
   CAE |
  | **Planes de Distribución** | Planificación diaria: qué productos y cuántas
  unidades por alumno | Admin, CAE |
  | **Escaneo QR** | Registro de distribuciones escaneando el QR del alumno, con
  soporte offline | Docente, Admin |
  | **Distribuciones** | Historial completo de distribuciones realizadas | Admin,
  Director, CAE |
  | **Etiquetas QR Lotes** | Generación e impresión de etiquetas QR para lotes de
  productos | Admin, Almacén |
  | **Historial de Movimientos** | Trazabilidad de todos los movimientos de stock |
  Admin, Director, CAE |
  | **Control Vehicular** | Registro de acceso de vehículos de proveedores |
  Operario Logístico, Admin |
  | **Actas de Recepción** | Generación de actas en PDF para ingresos | Admin, CAE,
  Almacén |
  | **Discrepancias** | Registro y seguimiento de diferencias en recepciones |
  Admin, Director, CAE |
  | **Reportes** | Generación de reportes exportables | Admin, Director, CAE |
  | **Usuarios** | Gestión de cuentas del sistema con roles | Admin |
  | **Portal del Padre** | Consulta de historial de distribuciones del alumno |
  Padre de Familia |

  ### Flujo de distribución

  Admin/CAE crea el plan del día (productos + cantidad por alumno)
      ↓
  Docente abre el Escaneo QR y escanea el carnet del alumno
      ↓
  El sistema valida el plan activo, registra la distribución
  y descuenta el stock automáticamente mediante triggers en la BD
      ↓
  Historial disponible en Distribuciones y Movimientos

  ### Soporte offline 

  El módulo de Escaneo QR funciona sin conexión. Los escaneos realizados sin
  internet se almacenan localmente en IndexedDB (Dexie) y se sincronizan
  automáticamente cuando se recupera la conexión.

  ## Roles del sistema

  | Rol | Descripción |
  |---|---|
  | `administrador` | Acceso completo a todos los módulos |
  | `director` | Visualización de inventario, distribuciones, movimientos y reportes
   |
  | `cae` | Gestión de alumnos, planes, distribuciones y actas |
  | `almacen` | Ingreso de productos, inventario, proveedores y ajustes de stock |
  | `docente` | Escaneo QR para registro de distribuciones |
  | `operario_logistico` | Control de acceso vehicular |
  | `padre_familia` | Portal de consulta del historial de su hijo |

  ## Estructura del proyecto

  src/
  ├── components/
  │   ├── features/        # Componentes específicos por módulo
  │   ├── layout/          # AppShell, Sidebar, Header
  │   ├── shared/          # DataTable, PageHeader, FilterBar, ConfirmDialog…
  │   └── ui/              # Primitivos (Button, Input, Select, Sheet…)
  ├── constants/           # Roles y navegación
  ├── hooks/
  │   ├── queries/         # Hooks de TanStack Query por módulo
  │   └── useMobile.js     # Hook responsive (mobile/tablet/desktop)
  ├── lib/                 # Cliente Supabase, offline DB (Dexie), utils
  ├── mock/                # Datos mock para desarrollo
  ├── pages/               # Una página por ruta
  ├── providers/           # AuthProvider (TanStack Query + Supabase Auth)
  ├── routes/              # Definición de rutas con React Router
  ├── schemas/             # Esquemas de validación Zod
  └── services/            # Lógica de acceso a datos (Supabase)

  ## Base de datos

  PostgreSQL gestionado por Supabase. Todas las tablas tienen **Row Level Security
  (RLS)** activo con políticas por rol.

  Tablas principales: `productos`, `stock`, `ingresos`, `detalle_ingresos`,
  `proveedores`, `alumnos`, `distribuciones`, `detalle_distribuciones`,
  `planes_distribucion`, `ajustes_stock`, `perfiles`, `actas_recepcion`,
  `discrepancias`, `acceso_vehicular`, `registro_movimientos`.

  El stock se mantiene actualizado automáticamente mediante triggers de PostgreSQL
  que recalculan `stock.cantidad_actual` ante cualquier ingreso, distribución o
  ajuste.

  Las migraciones se encuentran en `supabase/migrations/`.

  ## Configuración

  ### Variables de entorno

  Crea un archivo `.env` en la raíz del proyecto:

  ```env
  VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
  VITE_SUPABASE_ANON_KEY=<tu-anon-key>

  Instalación y desarrollo

  # Instalar dependencias
  npm install

  # Servidor de desarrollo
  npm run dev

  # Build de producción
  npm run build

  Aplicar migraciones en Supabase

  Ejecuta los archivos de supabase/migrations/ en orden cronológico desde el SQL
  Editor del dashboard de Supabase, comenzando por el schema principal
  nutrisync.sql.

  Despliegue

  El proyecto está configurado para Vercel con rewrite de rutas SPA (vercel.json).
  Cualquier push a main puede desplegarse directamente conectando el repositorio a
  Vercel y definiendo las variables de entorno.
  ```
