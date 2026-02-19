// SearchInput.tsx — Debounced real-time search input with glass styling
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useDebouncedValue } from "@tanstack/react-pacer";

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onSearch: (query: string) => void;
  className?: string;
  debounceMs?: number;
}

export function SearchInput({
  placeholder = "Search...",
  value = "",
  onSearch,
  className = "mb-4",
  debounceMs = 300,
}: SearchInputProps) {
  const [input, setInput] = useState(value);
  const [debounced] = useDebouncedValue(input, { wait: debounceMs });

  // Sync external value changes (e.g. URL param clears)
  useEffect(() => {
    setInput(value);
  }, [value]);

  // Fire onSearch when debounced value changes
  useEffect(() => {
    onSearch(debounced);
  }, [debounced, onSearch]);

  const handleClear = () => {
    setInput("");
  };

  return (
    <div className={className}>
      <div className="relative group/search glass-strong rounded-lg focus-within:ring-2 focus-within:ring-primary/20 transition-shadow">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/search:text-primary pointer-events-none transition-colors" />
        <Input
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="pl-10 pr-8 glass border-border/50 focus:ring-primary/30"
        />
        {input && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
