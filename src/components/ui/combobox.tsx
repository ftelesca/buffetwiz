import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  options: { value: string; label: string }[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  autoFocus?: boolean
  onCloseWithSelection?: () => void
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado encontrado.",
  className,
  autoFocus = false,
  onCloseWithSelection,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  // Filter and sort options based on search value
  const filteredOptions = options
    .filter((option) =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    )
    .sort((a, b) => a.label.localeCompare(b.label))

  // Auto open and focus search when autoFocus is true
  React.useEffect(() => {
    if (autoFocus) {
      setOpen(true)
    }
  }, [autoFocus])

  // Focus search input when combobox opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  const closeCombobox = () => {
    setOpen(false)
    setSearchValue("")
    // Focus next element (quantidade input)
    setTimeout(() => {
      onCloseWithSelection?.()
    }, 100)
  }

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === value) {
      onValueChange?.("")
    } else {
      onValueChange?.(selectedValue)
    }
    closeCombobox()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      e.stopPropagation()
      closeCombobox()
    } else if (e.key === "Tab") {
      e.preventDefault()
      closeCombobox()
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          onClick={() => setOpen(true)}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0" 
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} onKeyDown={handleKeyDown}>
          <CommandInput 
            ref={inputRef}
            placeholder={searchPlaceholder} 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredOptions.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}