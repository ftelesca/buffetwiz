import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons";

interface EventMenuItemFormProps {
  initialQty: number;
  productName: string;
  onSave: (qty: number) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const EventMenuItemForm = ({
  initialQty,
  productName,
  onSave,
  onCancel,
  isLoading = false
}: EventMenuItemFormProps) => {
  const [qty, setQty] = useState(initialQty.toString());

  const handleSave = () => {
    const qtyValue = parseFloat(qty) || 1;
    if (qtyValue <= 0) return;
    onSave(qtyValue);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="product-name">Produto</Label>
        <Input 
          id="product-name"
          value={productName} 
          disabled 
          className="bg-muted"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="qty">Quantidade</Label>
        <Input
          id="qty"
          type="number"
          step="0.001"
          min="0.001"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          disabled={isLoading}
          placeholder="1"
        />
      </div>
      
      <SaveCancelButtons
        onSave={handleSave}
        onCancel={onCancel}
        isLoading={isLoading}
        disabled={!qty || parseFloat(qty) <= 0}
      />
    </form>
  );
};