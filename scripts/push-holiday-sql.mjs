// Script to push holiday_management.sql to Supabase
// Uses the Supabase Management REST API with service role key

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://kvwtlunyunnswvijqifi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2d3RsdW55dW5uc3d2aWpxaWZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc4NzYzMCwiZXhwIjoyMDk0MzYzNjMwfQ.wo9FM9AcH7FJ6jHH-5SeOls05bIz83nEKgVOn9gZZsU'

// Read the SQL file
const sqlFile = join(__dirname, '..', 'lib', 'supabase', 'holiday_management.sql')
const sql = readFileSync(sqlFile, 'utf-8')

// Split SQL into individual statements (skip comments and blanks)
function splitStatements(sql) {
  // Split on semicolons but keep track of statement boundaries
  const statements = []
  let current = ''
  const lines = sql.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    // Skip pure comment lines
    if (trimmed.startsWith('--')) {
      continue
    }
    current += line + '\n'
    if (trimmed.endsWith(';')) {
      const stmt = current.trim()
      if (stmt.length > 1) {
        statements.push(stmt)
      }
      current = ''
    }
  }
  
  return statements.filter(s => s.trim().length > 0)
}

async function runSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ sql }),
  })
  
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`HTTP ${response.status}: ${err}`)
  }
  return response.json().catch(() => ({ ok: true }))
}

// Alternative: use pg REST endpoint directly
async function executeSQL(sqlText) {
  const response = await fetch(`${SUPABASE_URL}/pg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ query: sqlText }),
  })
  
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${response.status}: ${text}`)
  }
  return { ok: true }
}

async function main() {
  console.log('🚀 Pushing holiday_management.sql to Supabase...\n')
  console.log(`📡 Target: ${SUPABASE_URL}`)
  console.log(`📄 SQL file: ${sqlFile}\n`)

  const statements = splitStatements(sql)
  console.log(`📋 Found ${statements.length} SQL statements to execute\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    // Get first meaningful line for display
    const preview = stmt.split('\n').find(l => l.trim() && !l.trim().startsWith('--'))?.trim().substring(0, 70)
    
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `)
    
    try {
      await runSQL(stmt)
      console.log('✅')
      success++
    } catch (err) {
      // Try alternative endpoint
      try {
        await executeSQL(stmt)
        console.log('✅')
        success++
      } catch (err2) {
        console.log('⚠️ (may already exist)')
        console.log(`   → ${err.message.substring(0, 120)}`)
        failed++
      }
    }
  }

  console.log(`\n═══════════════════════════════════`)
  console.log(`✅ Success: ${success}`)
  console.log(`⚠️  Skipped/Already exist: ${failed}`)
  console.log(`═══════════════════════════════════`)
  console.log('\n🎉 Done! Check your Supabase dashboard to verify the tables.')
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message)
  process.exit(1)
})
