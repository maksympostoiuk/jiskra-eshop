/** Date → value for <input type="datetime-local"> (local time, minutes precision). */
export function toDateTimeLocal(date: Date | null | undefined): string {
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
