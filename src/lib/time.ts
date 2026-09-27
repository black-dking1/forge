/**
 * "2H AGO", "3D AGO" — the compact style from the mockup.
 *
 * Used by the build cards on Home and the next-step card on the
 * Overview tab, so both say time the same way.
 */
export function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'JUST NOW';
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'YESTERDAY';
  return `${days}D AGO`;
}
