import { useEffect, useState } from "react";

const STORAGE_KEY = "nutrisync-a11y";

const DEFAULTS = {
  tamañoTexto: "base",
  contraste: "normal",
  daltonismo: "ninguno",
  reducirMovimiento: false,
  resaltarEnlaces: false,
  resaltarFoco: false,
  dislexia: false,
  mascaraLectura: false,
};

function loadFromStorage() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return DEFAULTS;
  }
}

function applyClasses(state) {
  const html = document.documentElement;

  // Tamaño de texto: zoom en body escala todo (incluyendo inline styles)
  html.classList.remove("a11y-text-sm", "a11y-text-lg");
  if (state.tamañoTexto !== "base") html.classList.add(`a11y-text-${state.tamañoTexto}`);

  // Filtros combinados en body para que no se pisen entre sí
  const filters = [];
  if (state.contraste === "alto") filters.push("contrast(1.6) brightness(1.02)");
  if (state.contraste === "grises") filters.push("grayscale(1)");
  if (state.daltonismo !== "ninguno") filters.push(`url(#a11y-${state.daltonismo})`);
  document.body.style.filter = filters.join(" ") || "";

  html.classList.toggle("a11y-reduce-motion", state.reducirMovimiento);
  html.classList.toggle("a11y-highlight-links", state.resaltarEnlaces);
  html.classList.toggle("a11y-highlight-focus", state.resaltarFoco);
  html.classList.toggle("a11y-dislexia", state.dislexia);
}

export function useAccesibilidad() {
  const [state, setState] = useState(loadFromStorage);

  useEffect(() => {
    applyClasses(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const set = (key) => (value) =>
    setState((prev) => ({ ...prev, [key]: value }));

  return {
    tamañoTexto: state.tamañoTexto,
    setTamañoTexto: set("tamañoTexto"),
    contraste: state.contraste,
    setContraste: set("contraste"),
    daltonismo: state.daltonismo,
    setDaltonismo: set("daltonismo"),
    reducirMovimiento: state.reducirMovimiento,
    setReducirMovimiento: set("reducirMovimiento"),
    resaltarEnlaces: state.resaltarEnlaces,
    setResaltarEnlaces: set("resaltarEnlaces"),
    resaltarFoco: state.resaltarFoco,
    setResaltarFoco: set("resaltarFoco"),
    dislexia: state.dislexia,
    setDislexia: set("dislexia"),
    mascaraLectura: state.mascaraLectura,
    setMascaraLectura: set("mascaraLectura"),
    reset: () => setState(DEFAULTS),
  };
}
