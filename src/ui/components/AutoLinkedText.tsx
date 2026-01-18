import { Fragment } from "react";
import { Link } from "./Link";

interface AutoLinkedTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
}

/**
 * Component that automatically detects URLs in text and converts them to clickable links.
 * Internal links (starting with /) navigate within the app.
 * External links (http/https) open in the default browser.
 *
 * @example
 * ```tsx
 * <AutoLinkedText
 *   text="Check out https://example.com and visit /profile/123"
 *   linkClassName="text-blue-500 hover:underline"
 * />
 * ```
 */
export function AutoLinkedText({ text, className, linkClassName = "text-blue-500 hover:underline" }: AutoLinkedTextProps) {
  // Regex to match URLs and internal paths
  const urlRegex = /(https?:\/\/[^\s]+)|(\/[^\s]*)/g;
  const parts = text.split(urlRegex).filter(Boolean);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if it's a URL or path
        if (part?.match(/^https?:\/\//)) {
          // External URL
          return (
            <Link key={index} href={part} className={linkClassName}>
              {part}
            </Link>
          );
        } else if (part?.match(/^\//)) {
          // Internal path
          return (
            <Link key={index} href={part} className={linkClassName}>
              {part}
            </Link>
          );
        } else {
          // Regular text
          return <Fragment key={index}>{part}</Fragment>;
        }
      })}
    </span>
  );
}

/**
 * Hook to extract URLs from text
 */
export function useExtractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Hook to check if text contains URLs
 */
export function useHasUrls(text: string): boolean {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return urlRegex.test(text);
}
