/**
 * Given a teacher's class_assigned string like "Grade 5-A",
 * returns { class_name: "Grade 5", section: "A" }.
 * Falls back to the full string as class_name and empty section.
 */
export function parseClassAssigned(classAssigned: string): { class_name: string; section: string } {
  if (!classAssigned) return { class_name: '', section: '' }
  
  // Try dash first (e.g. "Grade 5 - A" or "Grade 5-A")
  const lastDash = classAssigned.lastIndexOf('-')
  if (lastDash > 0) {
    return {
      class_name: classAssigned.slice(0, lastDash).trim(),
      section:    classAssigned.slice(lastDash + 1).trim(),
    }
  }

  // Try to parse "Grade 5 A" or "Grade 5 B" (ends with a single letter)
  const match = classAssigned.trim().match(/^(.*?)\s+([a-zA-Z])$/);
  if (match) {
    return {
      class_name: match[1].trim(),
      section: match[2].trim().toUpperCase()
    }
  }

  // Try to parse "Grade 5 Section A"
  const secMatch = classAssigned.trim().match(/^(.*?)\s+section\s+([a-zA-Z])$/i);
  if (secMatch) {
    return {
      class_name: secMatch[1].trim(),
      section: secMatch[2].trim().toUpperCase()
    }
  }

  return { class_name: classAssigned.trim(), section: '' }
}

/**
 * Given a comma separated class_assigned string like "Grade 5-A, Grade 6-B",
 * returns an array of parsed classes.
 */
export function parseAllClassesAssigned(classAssigned: string): { class_name: string; section: string }[] {
  if (!classAssigned) return []
  return classAssigned.split(',').map(s => parseClassAssigned(s.trim()))
}
