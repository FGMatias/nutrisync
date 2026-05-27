import { describe, it, expect, vi } from "vitest";
import {
    formatCantidad,
    buildCantidadResumen,
    triggerDownload,
} from "../../utils/actasPdf";

describe("Funciones PDF", () => {

    it("debe formatear números a 2 decimales", () => {
        expect(formatCantidad(100.5678)).toBe("100.57");
    });

    it("debe retornar 0 con valores inválidos", () => {
        expect(formatCantidad(undefined)).toBe("0");
        expect(formatCantidad("texto")).toBe("0");
    });

    it("debe agrupar cantidades por unidad", () => {
        const data = [
            { cantidad: 5, unidad_medida: "kg" },
            { cantidad: 2, unidad_medida: "kg" },
            { cantidad: 10, unidad_medida: "un" },
        ];

        expect(buildCantidadResumen(data)).toContain("7 kg");
        expect(buildCantidadResumen(data)).toContain("10 un");
    });

    it("debe crear y eliminar enlace temporal de descarga", () => {
        const appendSpy = vi.spyOn(document.body, "appendChild");
        const removeSpy = vi.spyOn(document.body, "removeChild");

        triggerDownload("https://test.com/file.pdf", "archivo.pdf");

        expect(appendSpy).toHaveBeenCalled();
        expect(removeSpy).toHaveBeenCalled();
    });

});