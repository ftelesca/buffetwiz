import { useEffect } from "react"
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
  
  // Handle Enter key for save action
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        if (!disabled && !isLoading) {
          onSave()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onSave, disabled, isLoading])

  return (
    <div className="flex justify-end gap-2">
      <Button 
        onClick={onSave}
        disabled={isLoading || disabled}
        className="order-1"
      >
        {saveIcon}
        {saveLabel}
      </Button>
      <Button 
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