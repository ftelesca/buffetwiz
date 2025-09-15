import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface EventDeleteConfirmationProps {
  eventName: string;
  onDelete: () => void;
  isDeleting?: boolean;
  className?: string;
}

export function EventDeleteConfirmation({ 
  eventName, 
  onDelete, 
  isDeleting = false,
  className = ""
}: EventDeleteConfirmationProps) {
  const [confirmationName, setConfirmationName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    onDelete();
    setIsOpen(false);
    setConfirmationName("");
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setConfirmationName("");
    }
  };

  const isConfirmationValid = confirmationName.trim().toLowerCase() === eventName.trim().toLowerCase();

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          disabled={isDeleting}
          className={`hover:bg-destructive/10 hover:text-destructive ${className}`}
          title="Excluir evento"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão do evento</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação excluirá permanentemente o evento "{eventName}" e todos os menus relacionados. 
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <Label htmlFor="confirmation-name" className="text-sm font-medium">
            Digite o nome do evento para confirmar a exclusão:
          </Label>
          <Input
            id="confirmation-name"
            value={confirmationName}
            onChange={(e) => setConfirmationName(e.target.value)}
            placeholder={eventName}
            className="mt-2"
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmationValid || isDeleting}
          >
            {isDeleting ? "Excluindo..." : "Excluir evento"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}