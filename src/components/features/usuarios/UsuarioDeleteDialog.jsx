import ConfirmDialog from "../../shared/ConfirmDialog";

export default function UsuarioDeleteDialog({
  open,
  onOpenChange,
  usuario,
  onConfirm,
  loading,
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="¿Eliminar usuario?"
      description={
        usuario
          ? `Estás a punto de eliminar a "${usuario.nombre_completo}". El perfil será eliminado del sistema. Si el usuario tiene registros vinculados, no podrá eliminarse.`
          : ""
      }
      onConfirm={onConfirm}
      loading={loading}
      variant="danger"
      confirmLabel="Sí, eliminar"
    />
  );
}
