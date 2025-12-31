import type { FormEvent, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  buttonText?: string;
  extraButtons?: ReactNode;
  className?: string;
}

export function SearchInput({ 
  placeholder = "Search...", 
  value, 
  onChange, 
  onSubmit,
  buttonText = "Search",
  extraButtons,
  className = "mb-4"
}: SearchInputProps) {
  return (
    <form onSubmit={onSubmit} className={className}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">{buttonText}</Button>
        {extraButtons}
      </div>
    </form>
  );
}

