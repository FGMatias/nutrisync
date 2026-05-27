import { Loader2, Mail } from "lucide-react";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";

export default function UsuarioPasswordDialog({
  open,
  onOpenChange,
  usuario,
  onConfirm,
  loading,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 420 }}>
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>
            Se enviará un correo de restablecimiento a{" "}
            <strong>{usuario?.email}</strong>. El usuario recibirá un enlace
            para crear una nueva contraseña.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter style={{ gap: 8 }}>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {loading ? (
              <><Loader2 size={14} className="mr-2 animate-spin" /> Enviando...</>
            ) : (
              <><Mail size={14} className="mr-2" /> Enviar correo</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
