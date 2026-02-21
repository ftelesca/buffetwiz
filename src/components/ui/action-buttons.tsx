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
  editButtonClassName?: string;
  deleteButtonClassName?: string;
}

export function ActionButtons({ 
  onEdit, 
  onDelete, 
  itemName, 
  itemType,
  isDeleting = false,
  showEdit = true,
  editButtonClassName = "",
  deleteButtonClassName = ""
}: ActionButtonsProps) {
  return (
    <div className="flex gap-1 justify-center">
      {showEdit && onEdit && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onEdit}
          title="Editar"
          className={`text-muted-foreground hover:text-foreground ${editButtonClassName}`}
        >
          <Edit className="h-4 w-4" />
        </Button>
      )}
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            disabled={isDeleting}
            className={`text-muted-foreground hover:bg-destructive/10 hover:text-destructive ${deleteButtonClassName}`}
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
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
