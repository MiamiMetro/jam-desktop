import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

function formatExactDateTime(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

interface TimestampProps {
  date: Date | string | number;
  children: React.ReactNode;
  className?: string;
}

export function Timestamp({ date, children, className }: TimestampProps) {
  const dateObj =
    date instanceof Date
      ? date
      : typeof date === "number"
        ? new Date(date)
        : new Date(date);

  const exact = formatExactDateTime(dateObj);
  if (!exact) return <span className={className}>{children}</span>;

  return (
    <Tooltip>
      <TooltipTrigger render={<span />} className={`cursor-default decoration-dotted underline-offset-2 hover:underline ${className ?? ""}`}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{exact}</TooltipContent>
    </Tooltip>
  );
}
