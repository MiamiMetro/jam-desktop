import type { ReactNode } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

/**
 * Get the app's domain URLs from environment variables
 */
function getAppDomains(): string[] {
  const domains: string[] = [];

  // Get domain from VITE_SITE_URL environment variable
  const siteUrl = import.meta.env.VITE_SITE_URL;
  if (siteUrl) {
    try {
      const url = new URL(siteUrl);
      domains.push(url.hostname);
    } catch {
      // Invalid URL, skip
    }
  }

  return domains;
}

/**
 * Check if a URL belongs to your app's domain
 */
function isAppDomain(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const appDomains = getAppDomains();

    // Check if hostname matches any app domain
    return appDomains.some(domain =>
      parsedUrl.hostname === domain ||
      parsedUrl.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Extract the path from your app's URL
 * Example: https://yourapp.com/#/profile/123 → /profile/123
 * Example: https://yourapp.com/profile/123 → /profile/123
 */
function extractPathFromAppUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);

    // If using HashRouter, path is in the hash
    if (parsedUrl.hash) {
      // Remove the leading '#' from hash
      return parsedUrl.hash.substring(1);
    }

    // Otherwise use pathname
    return parsedUrl.pathname === '/' ? '/feed' : parsedUrl.pathname;
  } catch {
    return '/';
  }
}

/**
 * Smart link component that automatically handles:
 * - Internal paths (/profile/123) → uses React Router (stays in app)
 * - Your app's domain URLs (https://yourapp.com/...) → converts to internal navigation (stays in app)
 * - External links (https://twitter.com) → opens in default browser
 *
 * @example
 * ```tsx
 * // Internal navigation (stays in app)
 * <Link href="/profile/123">View Profile</Link>
 *
 * // Your domain - deep link (stays in app)
 * <Link href="https://yourapp.com/profile/123">View Profile</Link>
 *
 * // External link (opens in browser)
 * <Link href="https://twitter.com">Share on Twitter</Link>
 * ```
 */
export function Link({ href, children, className }: LinkProps) {
  const navigate = useNavigate();

  // Check if link is a full URL
  const isFullUrl = href.startsWith('http://') || href.startsWith('https://');

  // If it's a full URL, check if it's your app's domain
  if (isFullUrl) {
    if (isAppDomain(href)) {
      // This is your app's domain - handle as internal navigation
      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        const path = extractPathFromAppUrl(href);
        navigate(path);
      };

      return (
        <a href={href} onClick={handleClick} className={className}>
          {children}
        </a>
      );
    } else {
      // External domain - open in browser
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
  }

  // Internal path - use React Router
  return (
    <RouterLink to={href} className={className}>
      {children}
    </RouterLink>
  );
}
