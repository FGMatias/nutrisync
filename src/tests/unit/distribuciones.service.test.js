import {
    buildAlumnoNombre,
    getLocalDateKey,
    getTimestamp,
    isDuplicateDistribucionError,
    sortDistribuciones,
} from "../../services/distribuciones.service";

import { describe, expect, it } from "vitest";

describe("Funciones de distribuciones", () => {

    it("debe construir nombre completo del alumno", () => {
        const alumno = {
            nombre: "Carlos",
            apellido: "Quispe",
        };

        expect(buildAlumnoNombre(alumno))
            .toBe("Carlos Quispe");
    });

    it("debe generar fecha local YYYY-MM-DD", () => {
        expect(
            getLocalDateKey("2026-05-27T10:20:30")
        ).toBe("2026-05-27");
    });

    it("debe obtener timestamp valido", () => {
        const result = getTimestamp("2026-05-27T10:20:30");

        expect(typeof result).toBe("number");
        expect(result).toBeGreaterThan(0);
    });

    it("debe detectar error de duplicidad", () => {
        const error = {
            code: "23505",
        };

        expect(
            isDuplicateDistribucionError(error)
        ).toBe(true);
    });

    it("debe ordenar distribuciones por timestamp descendente", () => {

        const data = [
            { timestamp: 100 },
            { timestamp: 300 },
            { timestamp: 200 },
        ];

        const result = sortDistribuciones(data);

        expect(result[0].timestamp).toBe(300);
        expect(result[1].timestamp).toBe(200);
        expect(result[2].timestamp).toBe(100);
    });

});