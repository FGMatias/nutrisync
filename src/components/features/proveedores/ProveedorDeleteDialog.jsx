import ConfirmDialog from "../../shared/ConfirmDialog";

export default function ProveedorDeleteDialog({
  open,
  onOpenChange,
  proveedor,
  onConfirm,
  loading,
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="¿Eliminar proveedor?"
      description={
        proveedor
          ? `Estás a punto de eliminar a "${proveedor.nombre}". Esta acción no se puede deshacer. Si el proveedor tiene ingresos registrados, no podrá ser eliminado.`
          : ""
      }
      onConfirm={onConfirm}
      loading={loading}
      variant="danger"
      confirmLabel="Sí, eliminar"
    />
  );
}
