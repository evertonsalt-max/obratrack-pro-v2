import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { Readable } from 'stream'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function toCSV(rows: any[], cols: string[]) {
  const header = cols.join(';')
  const lines = rows.map(r =>
    cols.map(c => {
      const v = String(r[c] ?? '').replace(/"/g, '""')
      return v.includes(';') ? '"' + v + '"' : v
    }).join(';')
  )
  return [header, ...lines].join('\n')
}

async function getDrive() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').split('\\n').join('\n')
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })
  return google.drive({ version: 'v3', auth })
}

async function uploadCSV(drive: any, name: string, csv: string) {
  const buf = Buffer.from('\uFEFF' + csv, 'utf-8')
  const stream = Readable.from([buf])
  await drive.files.create({
    requestBody: {
      name,
      mimeType: 'text/csv',
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
    },
    media: { mimeType: 'text/csv', body: stream },
  })
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== 'Bearer ' + process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const drive = await getDrive()
    const date = new Date().toISOString().split('T')[0]

    const [logs, employees, payments, taxes] = await Promise.all([
      supabase.from('work_logs').select('*').then(r => r.data || []),
      supabase.from('employees').select('*').then(r => r.data || []),
      supabase.from('payments').select('*').then(r => r.data || []),
      supabase.from('employee_taxes').select('*').then(r => r.data || []),
    ])

    await Promise.all([
      uploadCSV(drive, date + '_horarios.csv', toCSV(logs, ['id','employee_id','employee_name','data','jornada','local','entrada','saida','horas','diaria','discount_value','absence_reason','obs'])),
      uploadCSV(drive, date + '_funcionarios.csv', toCSV(employees, ['id','nome','apelido','funcao','diaria','status'])),
      uploadCSV(drive, date + '_pagamentos.csv', toCSV(payments, ['id','employee_id','employee_name','data','valor','tipo','obs'])),
      uploadCSV(drive, date + '_encargos.csv', toCSV(taxes, ['id','employee_id','month','year','inss_value','fgts_value','notes'])),
    ])

    return NextResponse.json({ ok: true, date, tables: ['horarios','funcionarios','pagamentos','encargos'] })
  } catch (err: any) {
    console.error('Backup error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
