/**
 * Opens a URL in the user's default browser.
 * Works in both Electron and web environments.
 *
 * @param url - The URL to open (must be http:// or https://)
 * @returns Promise that resolves when the link is opened
 *
 * @example
 * ```tsx
 * // In your component
 * const handleShareClick = () => {
 *   openExternal('https://twitter.com/share?url=...');
 * };
 * ```
 */
export async function openExternal(url: string): Promise<void> {
  // Validate URL
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Only HTTP/HTTPS URLs are allowed');
    }
  } catch (error) {
    console.error('Invalid URL:', url, error);
    throw error;
  }

  // In Electron, use the IPC handler
  if (window.electron?.openExternal) {
    const result = await window.electron.openExternal(url);
    if (!result.success) {
      throw new Error(result.error || 'Failed to open external link');
    }
  } else {
    // Fallback for web version - open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
