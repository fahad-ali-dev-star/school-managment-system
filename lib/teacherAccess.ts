/**
 * Given a teacher's class_assigned string like "Grade 5-A",
 * returns { class_name: "Grade 5", section: "A" }.
 * Falls back to the full string as class_name and empty section.
 */
export function parseClassAssigned(classAssigned: string): { class_name: string; section: string } {
  if (!classAssigned) return { class_name: '', section: '' }
  const lastDash = classAssigned.lastIndexOf('-')
  if (lastDash > 0) {
    return {
      class_name: classAssigned.slice(0, lastDash).trim(),
      section:    classAssigned.slice(lastDash + 1).trim(),
    }
  }
  return { class_name: classAssigned.trim(), section: '' }
}
