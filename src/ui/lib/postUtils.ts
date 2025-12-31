/**
 * Format a date as a relative time string (e.g., "2h ago", "3d ago")
 */
export function formatTimeAgo(date: Date | string): string {
  // Handle both Date objects and ISO date strings
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Validate date
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return 'just now';
  }
  
  const now = new Date().getTime();
  const dateTime = dateObj.getTime();
  const diff = now - dateTime;
  
  // Handle future dates
  if (diff < 0) {
    return 'just now';
  }
  
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Format duration in seconds as MM:SS
 */
export function formatDuration(seconds: number): string {
  const roundedSeconds = Math.round(seconds);
  const mins = Math.floor(roundedSeconds / 60);
  const secs = roundedSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

