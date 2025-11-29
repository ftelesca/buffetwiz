import { Button } from "@/components/ui/button"
import { Save, X } from "lucide-react"

interface SaveCancelButtonsProps {
  onSave: () => void
  onCancel: () => void
  saveLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  disabled?: boolean
  saveIcon?: React.ReactNode
  cancelIcon?: React.ReactNode
}

export function SaveCancelButtons({
  onSave,
  onCancel,
  saveLabel = "Salvar",
  cancelLabel = "Cancelar",
  isLoading = false,
  disabled = false,
  saveIcon = <Save className="h-4 w-4" />,
  cancelIcon = <X className="h-4 w-4" />
}: SaveCancelButtonsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button 
        type="submit"
        disabled={isLoading || disabled}
        className="order-1"
      >
        {saveIcon}
        {saveLabel}
      </Button>
      <Button 
        type="button"
        variant="outline" 
        onClick={onCancel}
        disabled={isLoading}
        className="order-2"
      >
        {cancelIcon}
        {cancelLabel}
      </Button>
    </div>
  )
}