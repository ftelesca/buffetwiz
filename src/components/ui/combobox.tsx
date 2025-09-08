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
  onFocusNext?: () => void
}

export const Combobox = React.forwardRef<
  React.ElementRef<typeof Button>,
  ComboboxProps
>(({
  options,
  value,
  onValueChange,
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado encontrado.",
  className,
  onFocusNext,
  ...props
}, ref) => {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const commandInputRef = React.useRef<HTMLInputElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  // Sort options alphabetically
  const sortedOptions = React.useMemo(() => 
    [...options].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  , [options])

  // Handle when combobox gains focus
  React.useEffect(() => {
    if (open && commandInputRef.current) {
      // Focus search input when opened
      setTimeout(() => {
        commandInputRef.current?.focus()
      }, 0)
    }
  }, [open])

  const handleSelect = (currentValue: string) => {
    const option = sortedOptions.find(opt => opt.label === currentValue)
    if (option) {
      onValueChange?.(option.value)
      setOpen(false)
      setSearch("")
      // Focus next input (quantity) after selection
      setTimeout(() => {
        onFocusNext?.()
      }, 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
      setSearch("")
      setTimeout(() => {
        onFocusNext?.()
      }, 100)
    } else if (e.key === "Tab") {
      setOpen(false)
      setSearch("")
      setTimeout(() => {
        onFocusNext?.()
      }, 100)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          onFocus={() => setOpen(true)}
          {...props}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50">
        <Command shouldFilter={false}>
          <CommandInput 
            ref={commandInputRef}
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {sortedOptions
                .filter(option => 
                  option.label.toLowerCase().includes(search.toLowerCase())
                )
                .map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={handleSelect}
                  onKeyDown={handleKeyDown}
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})

Combobox.displayName = "Combobox"