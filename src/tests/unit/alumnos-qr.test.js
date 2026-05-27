import { describe, it, expect } from "vitest";

import {
    buildAlumnoQrPayload,
    parseAlumnoQrPayload,
} from "../../lib/alumnos-qr";

describe("Funciones QR de alumnos", () => {

    it("debe retornar string vacío si alumno es null", () => {
        const result = buildAlumnoQrPayload(null);

        expect(result).toBe("");
    });

    it("debe retornar codigo_qr si el alumno existe", () => {
        const alumno = {
            codigo_qr: "123-abc-456"
        };

        const result = buildAlumnoQrPayload(alumno);

        expect(result).toBe("123-abc-456");
    });

    it("debe parsear correctamente QR con prefijo NSA", () => {
        const uuid = "123e4567-e89b-12d3-a456-426614174000";

        const result = parseAlumnoQrPayload(`NSA|${uuid}`);

        expect(result).toEqual({
            t: "alumno",
            v: 2,
            qr: uuid,
        });
    });

    it("debe retornar null para texto inválido", () => {
        const result = parseAlumnoQrPayload("https://google.com");

        expect(result).toBeNull();
    });

});