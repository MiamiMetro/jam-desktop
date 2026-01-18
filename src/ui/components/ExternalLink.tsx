import type { ReactNode } from "react";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

/**
 * Component for opening external links in the user's default browser.
 * Works in both Electron (uses shell.openExternal) and web (uses target="_blank").
 */
export function ExternalLink({ href, children, className }: ExternalLinkProps) {
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    // In Electron, use the IPC handler
    if (window.electron?.openExternal) {
      try {
        const result = await window.electron.openExternal(href);
        if (!result.success) {
          console.error('Failed to open link:', result.error);
        }
      } catch (error) {
        console.error('Error opening external link:', error);
      }
    } else {
      // Fallback for web version - open in new tab
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
