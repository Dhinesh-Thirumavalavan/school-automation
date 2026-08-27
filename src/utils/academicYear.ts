export function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  // Assuming academic year starts in June
  if (month >= 6) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}
