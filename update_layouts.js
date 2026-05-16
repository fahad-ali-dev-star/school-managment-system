const fs = require('fs');
const filesToUpdate = [
  'app/analytics/layout.tsx',
  'app/classes/layout.tsx',
  'app/exams/layout.tsx',
  'app/leaves/layout.tsx',
  'app/notifications/layout.tsx',
  'app/report-cards/layout.tsx',
  'app/teachers/layout.tsx'
];

for (const file of filesToUpdate) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import \{ createClient \} from '@\/lib\/supabase\/server'/g, "import { getProfile } from '@/lib/supabase/getProfile'");
  
  const replacement = `  const profile = await getProfile()
  if (!profile) redirect('/login')

  const authUser: AuthUser = {
    id: profile.id, school_id: profile.school_id,
    full_name: profile.full_name, email: profile.email,
    role: profile.role as AuthUser['role'],
    school_name: profile.school_name ?? 'Beacon Light School',
    plan: profile.plan as string
  }`;

  content = content.replace(/  const supabase = createClient\(\)[\s\S]*?school\?\.name \?\? 'Beacon Light School',\n  \}/, replacement);
  fs.writeFileSync(file, content);
}

// Special case for parents/layout.tsx
const parentsFile = 'app/parents/layout.tsx';
let parentsContent = fs.readFileSync(parentsFile, 'utf8');
parentsContent = parentsContent.replace(/import \{ createClient \} from '@\/lib\/supabase\/server'/g, "import { getProfile } from '@/lib/supabase/getProfile'");
const parentsReplacement = `  const profile = await getProfile()
  if (!profile || !['admin', 'principal'].includes(profile.role)) redirect('/dashboard')

  const authUser: AuthUser = {
    id: profile.id, school_id: profile.school_id,
    full_name: profile.full_name, email: profile.email,
    role: profile.role as AuthUser['role'],
    school_name: profile.school_name ?? 'Beacon Light School',
    plan: profile.plan as string
  }`;
parentsContent = parentsContent.replace(/  const supabase = createClient\(\)[\s\S]*?school\?\.name \?\? 'Beacon Light School',\n  \}/, parentsReplacement);
fs.writeFileSync(parentsFile, parentsContent);

// Create missing layouts
const missingLayouts = [
  { path: 'app/students/layout.tsx', name: 'StudentsLayout' },
  { path: 'app/attendance/layout.tsx', name: 'AttendanceLayout' },
  { path: 'app/fees/layout.tsx', name: 'FeesLayout' }
];

for (const layout of missingLayouts) {
  const content = `import { getProfile } from '@/lib/supabase/getProfile'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import type { AuthUser } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ${layout.name}({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const authUser: AuthUser = {
    id: profile.id, school_id: profile.school_id,
    full_name: profile.full_name, email: profile.email,
    role: profile.role as AuthUser['role'],
    school_name: profile.school_name ?? 'Beacon Light School',
    plan: profile.plan as string
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar user={authUser} />
      <main style={{ flex: 1, overflow: 'auto', background: '#f8fafc' }}>
        {children}
      </main>
    </div>
  )
}`;
  if (!fs.existsSync(layout.path)) {
    fs.writeFileSync(layout.path, content);
  }
}
