import { describe, it, expect } from "vitest";
import { cn } from "../../lib/utils";

describe("Función cn", () => {

    it("debe sobrescribir clases conflictivas de Tailwind", () => {
        const result = cn("p-4", "p-2");

        expect(result).toBe("p-2");
    });

    it("debe mantener clases válidas condicionales", () => {
        const result = cn(true && "bg-red-500");

        expect(result).toContain("bg-red-500");
    });

});