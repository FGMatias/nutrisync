import { Badge } from "../ui/badge";

const STATUS_CONFIG = {
  true: {
    label: "Activo",
    style: {
      background: "var(--success-bg)",
      color: "var(--success)",
      border: "none",
    },
  },
  false: {
    label: "Inactivo",
    style: {
      background: "var(--danger-bg)",
      color: "var(--danger)",
      border: "none",
    },
  },
  registrado: {
    label: "Registrado",
    style: {
      background: "var(--info-bg)",
      color: "var(--info)",
      border: "none",
    },
  },
  conforme: {
    label: "Conforme",
    style: {
      background: "var(--success-bg)",
      color: "var(--success)",
      border: "none",
    },
  },
  con_discrepancia: {
    label: "Con Discrepancia",
    style: {
      background: "var(--warning-bg)",
      color: "var(--warning)",
      border: "none",
    },
  },
  anulado: {
    label: "Anulado",
    style: {
      background: "var(--muted)",
      color: "var(--muted-fg)",
      border: "none",
    },
  },
  estable: {
    label: "Normal",
    style: {
      background: "var(--success-bg)",
      color: "var(--success)",
      border: "none",
    },
  },
  stock_bajo: {
    label: "Bajo mínimo",
    style: {
      background: "var(--warning-bg)",
      color: "var(--warning)",
      border: "none",
    },
  },
  stock_alto: {
    label: "Sobre máximo",
    style: {
      background: "var(--info-bg)",
      color: "var(--info)",
      border: "none",
    },
  },
  sin_stock: {
    label: "Sin stock",
    style: {
      background: "var(--danger-bg)",
      color: "var(--danger)",
      border: "none",
    },
  },
  pendiente: {
    label: "Pendiente",
    style: {
      background: "var(--warning-bg)",
      color: "var(--warning)",
      border: "none",
    },
  },
  online: {
    label: "En línea",
    style: {
      background: "var(--success-bg)",
      color: "var(--success)",
      border: "none",
    },
  },
  offline: {
    label: "Offline",
    style: {
      background: "var(--danger-bg)",
      color: "var(--danger)",
      border: "none",
    },
  },
  sincronizado: {
    label: "Sincronizado",
    style: {
      background: "var(--info-bg)",
      color: "var(--info)",
      border: "none",
    },
  },
};

export default function StatusBadge({ status, label: customLabel }) {
  const key = String(status);
  const config = STATUS_CONFIG[key] ?? {
    label: customLabel ?? key,
    style: {
      background: "var(--muted)",
      color: "var(--muted-fg)",
      border: "none",
    },
  };
  return (
    <Badge style={{ ...config.style, fontSize: 11, fontWeight: 500 }}>
      {customLabel ?? config.label}
    </Badge>
  );
}
