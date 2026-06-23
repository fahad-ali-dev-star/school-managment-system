/**
 * Given a teacher's class_assigned string like "Grade 5-A",
 * returns { class_name: "Grade 5", section: "A" }.
 * Falls back to the full string as class_name and empty section.
 */
export function parseClassAssigned(classAssigned: string): { class_name: string; section: string } {
  if (!classAssigned) return { class_name: '', section: '' }
  
  const trimmed = classAssigned.trim()

  let className = trimmed
  let section = ''

  // 1. Try to parse "Grade 5 Section A"
  const secMatch = trimmed.match(/^(.*?)\s+section\s+([a-zA-Z])$/i)
  if (secMatch) {
    className = secMatch[1].trim()
    section = secMatch[2].trim().toUpperCase()
  } else {
    // 2. Try to parse ending with a single letter preceded by space or dash.
    // This handles "Grade 5 A", "Grade 5 - A", "Grade 5-A", "Play-Group A", "Play-Group-A"
    const match = trimmed.match(/^(.*?)(?:\s+|-)\s*([a-zA-Z])$/)
    if (match) {
      className = match[1].trim()
      section = match[2].trim().toUpperCase()
    }
  }

  // Normalize className case (e.g. "nursery" -> "Nursery", "grade 5" -> "Grade 5")
  className = className.replace(/\b\w/g, c => c.toUpperCase())
  
  // Fix common typo for Play-Group
  if (className === 'Play Group') {
    className = 'Play-Group'
  }

  return { class_name: className, section }
}

/**
 * Given a comma separated class_assigned string like "Grade 5-A, Grade 6-B",
 * returns an array of parsed classes.
 */
export function parseAllClassesAssigned(classAssigned: string): { class_name: string; section: string }[] {
  if (!classAssigned) return []
  return classAssigned.split(',').map(s => parseClassAssigned(s.trim()))
}
