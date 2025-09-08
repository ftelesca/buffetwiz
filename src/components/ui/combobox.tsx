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
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado encontrado.",
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const commandInputRef = React.useRef<HTMLInputElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [options, searchValue])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
      return
    }
    
    if (e.key === "Tab") {
      setOpen(false)
      return
    }

    // If typing a character while focused, open combo and pass to search
    if (!open && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setSearchValue(e.key)
      setOpen(true)
      e.preventDefault()
      // Focus the command input after opening
      setTimeout(() => {
        commandInputRef.current?.focus()
      }, 0)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchValue("")
    } else {
      // Focus the command input when opening
      setTimeout(() => {
        commandInputRef.current?.focus()
      }, 0)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            ref={commandInputRef}
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
                    value={option.label}
                    onSelect={() => {
                      onValueChange?.(option.value === value ? "" : option.value)
                      setOpen(false)
                    }}
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