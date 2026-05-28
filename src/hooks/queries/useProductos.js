import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAjusteStock,
  createProducto,
  deleteProducto,
  getAjustesStock,
  getInventario,
  getProductosPorProveedor,
  toggleActivoProducto,
  updateProducto,
} from "../../services/productos.service";

const KEY = "productos";
const INVENTARIO_KEY = "inventario";

export function useInventario() {
  return useQuery({
    queryKey: [INVENTARIO_KEY],
    queryFn: getInventario,
    staleTime: 30_000,
  });
}

export function useProductosPorProveedor(idProveedor) {
  return useQuery({
    queryKey: [KEY, "proveedor", idProveedor],
    queryFn: () => getProductosPorProveedor(idProveedor),
    enabled: !!idProveedor,
    staleTime: 30_000,
  });
}

export function useCreateProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProducto,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      toast.success("Producto definido correctamente");
    },
    onError: (error) => {
      toast.error(error.message ?? "No se pudo definir el producto");
    },
  });
}

export function useUpdateProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateProducto(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      toast.success("Producto actualizado correctamente");
    },
    onError: (error) => {
      toast.error(error.message ?? "No se pudo actualizar el producto");
    },
  });
}

export function useDeleteProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProducto,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      toast.success("Producto eliminado correctamente");
    },
    onError: (error) => {
      toast.error(error.message ?? "No se pudo eliminar el producto");
    },
  });
}

export function useToggleActivoProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }) => toggleActivoProducto(id, activo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      toast.success("Estado del producto actualizado");
    },
    onError: (error) => {
      toast.error(error.message ?? "No se pudo cambiar el estado del producto");
    },
  });
}

export function useAjustesStock(filters = {}) {
  return useQuery({
    queryKey: ["ajustes_stock", filters],
    queryFn: () => getAjustesStock(filters),
    staleTime: 30_000,
  });
}

export function useAjustarStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAjusteStock,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      qc.invalidateQueries({ queryKey: ["ajustes_stock"] });
      toast.success("Stock actualizado correctamente");
    },
    onError: (error) => {
      toast.error(error.message ?? "No se pudo ajustar el stock");
    },
  });
}
