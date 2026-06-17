import { Accessibility, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Switch } from "../ui/switch";

const TAMAÑOS = [
  { key: "sm", label: "A", fontSize: 13, desc: "Pequeño" },
  { key: "base", label: "A", fontSize: 17, desc: "Normal" },
  { key: "lg", label: "A", fontSize: 22, desc: "Grande" },
];

const CONTRASTES = [
  {
    key: "normal",
    label: "Normal",
    bgColor: "#ffffff",
    fgColor: "#0f172a",
    borderColor: "#e2e8f0",
  },
  {
    key: "alto",
    label: "Alto contraste",
    bgColor: "#000000",
    fgColor: "#facc15",
    borderColor: "#facc15",
  },
  {
    key: "grises",
    label: "Escala de grises",
    bgColor: "#d4d4d4",
    fgColor: "#262626",
    borderColor: "#a3a3a3",
  },
];

const DALTONISMO = [
  { key: "ninguno", label: "Sin filtro", colors: ["#e74c3c", "#2ecc71", "#3498db"] },
  { key: "deuteranopia", label: "Deuteranopia", colors: ["#c8a400", "#c8a400", "#3498db"] },
  { key: "protanopia", label: "Protanopia", colors: ["#9a8800", "#9a8800", "#4a90d9"] },
  { key: "tritanopia", label: "Tritanopia", colors: ["#e74c3c", "#2e8b8b", "#2e8b8b"] },
];

const SectionLabel = ({ children }) => (
  <p
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: "var(--muted-fg)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      marginBottom: 12,
    }}
  >
    {children}
  </p>
);

const ColorDots = ({ colors }) => (
  <span
    aria-hidden="true"
    style={{ display: "inline-flex", gap: 3, flexShrink: 0 }}
  >
    {colors.map((c, i) => (
      <span
        key={i}
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: c,
          display: "inline-block",
        }}
      />
    ))}
  </span>
);

export default function AccesibilidadPanel({ open, onOpenChange, a11y }) {
  const switches = [
    {
      id: "reducir",
      label: "Reducir animaciones",
      desc: "Menos parpadeos y transiciones",
      checked: a11y.reducirMovimiento,
      onChange: a11y.setReducirMovimiento,
    },
    {
      id: "mascara",
      label: "Máscara de lectura",
      desc: "Resalta la línea bajo el cursor",
      checked: a11y.mascaraLectura,
      onChange: a11y.setMascaraLectura,
    },
    {
      id: "dislexia",
      label: "Fuente para dislexia",
      desc: "Fuente Lexend, mayor espaciado",
      checked: a11y.dislexia,
      onChange: a11y.setDislexia,
    },
    {
      id: "enlaces",
      label: "Resaltar enlaces",
      desc: "Los enlaces se verán subrayados",
      checked: a11y.resaltarEnlaces,
      onChange: a11y.setResaltarEnlaces,
    },
    {
      id: "foco",
      label: "Resaltar foco del teclado",
      desc: "Borde visible al navegar con Tab",
      checked: a11y.resaltarFoco,
      onChange: a11y.setResaltarFoco,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[320px] sm:w-[320px] p-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="px-6 pt-6 pb-4 pr-14 shrink-0">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Accessibility size={20} style={{ color: "var(--primary)", flexShrink: 0 }} />
            <SheetTitle>Accesibilidad</SheetTitle>
          </div>
          <SheetDescription>
            Personaliza la aplicación según tus necesidades
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* TAMAÑO DE TEXTO */}
          <section style={{ marginBottom: 24 }}>
            <SectionLabel>Tamaño del texto</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
              }}
            >
              {TAMAÑOS.map((t) => {
                const active = a11y.tamañoTexto === t.key;
                return (
                  <Button
                    key={t.key}
                    variant={active ? "default" : "outline"}
                    onClick={() => a11y.setTamañoTexto(t.key)}
                    aria-pressed={active}
                    aria-label={`Texto ${t.desc}`}
                    style={{
                      height: 72,
                      flexDirection: "column",
                      gap: 6,
                      padding: "8px 4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: t.fontSize, lineHeight: 1, fontWeight: 700 }}>
                      {t.label}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 400 }}>{t.desc}</span>
                  </Button>
                );
              })}
            </div>
          </section>

          <Separator style={{ marginBottom: 24 }} />

          {/* CONTRASTE Y COLOR */}
          <section style={{ marginBottom: 24 }}>
            <SectionLabel>Contraste y color</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CONTRASTES.map((c) => {
                const active = a11y.contraste === c.key;
                return (
                  <Button
                    key={c.key}
                    variant={active ? "default" : "outline"}
                    onClick={() => a11y.setContraste(c.key)}
                    aria-pressed={active}
                    aria-label={c.label}
                    style={{
                      justifyContent: "flex-start",
                      height: 52,
                      gap: 14,
                      paddingLeft: 14,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 38,
                        height: 24,
                        borderRadius: 4,
                        background: c.bgColor,
                        border: `2px solid ${c.borderColor}`,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Georgia, serif",
                          fontSize: 13,
                          fontWeight: 700,
                          color: c.fgColor,
                          lineHeight: 1,
                        }}
                      >
                        A
                      </span>
                    </span>
                    <span style={{ fontSize: 14 }}>{c.label}</span>
                  </Button>
                );
              })}
            </div>
          </section>

          <Separator style={{ marginBottom: 24 }} />

          {/* MODO DALTÓNICO */}
          <section style={{ marginBottom: 24 }}>
            <SectionLabel>Modo daltónico</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
              }}
            >
              {DALTONISMO.map((d) => {
                const active = a11y.daltonismo === d.key;
                return (
                  <Button
                    key={d.key}
                    variant={active ? "default" : "outline"}
                    onClick={() => a11y.setDaltonismo(d.key)}
                    aria-pressed={active}
                    aria-label={d.label}
                    style={{
                      height: 64,
                      flexDirection: "column",
                      gap: 8,
                      padding: "8px 6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ColorDots colors={d.colors} />
                    <span style={{ fontSize: 11, fontWeight: 500, textAlign: "center", lineHeight: 1.3 }}>
                      {d.label}
                    </span>
                  </Button>
                );
              })}
            </div>
          </section>

          <Separator style={{ marginBottom: 24 }} />

          {/* OPCIONES ADICIONALES */}
          <section>
            <SectionLabel>Opciones adicionales</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {switches.map((opt) => (
                <div
                  key={opt.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div>
                    <Label
                      htmlFor={`a11y-${opt.id}`}
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "block",
                      }}
                    >
                      {opt.label}
                    </Label>
                    <p style={{ fontSize: 12, color: "var(--muted-fg)", margin: "2px 0 0" }}>
                      {opt.desc}
                    </p>
                  </div>
                  <Switch
                    id={`a11y-${opt.id}`}
                    checked={opt.checked}
                    onCheckedChange={opt.onChange}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "16px 24px",
            flexShrink: 0,
          }}
        >
          <Button
            variant="ghost"
            onClick={a11y.reset}
            style={{ width: "100%", gap: 8 }}
          >
            <RotateCcw size={14} />
            Restablecer valores por defecto
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
