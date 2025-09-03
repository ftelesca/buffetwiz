import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete: () => void;
  itemName: string;
  itemType: string;
  isDeleting?: boolean;
  showEdit?: boolean;
}

export function ActionButtons({ 
  onEdit, 
  onDelete, 
  itemName, 
  itemType,
  isDeleting = false,
  showEdit = true 
}: ActionButtonsProps) {
  return (
    <div className="flex gap-1">
      {showEdit && onEdit && (
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          title="Editar"
          className="px-3"
        >
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
      )}
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={isDeleting}
            className="hover:bg-destructive/10 hover:text-destructive px-3"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {itemType} "{itemName}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}