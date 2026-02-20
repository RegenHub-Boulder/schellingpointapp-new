'use client'

import * as React from 'react'
import { Upload, FileText, AlertCircle, CheckCircle, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CSVSessionImportProps {
  eventSlug: string
  tracks: { id: string; name: string }[]
  onImportComplete: (count: number) => void
}

interface ParsedRow {
  title: string
  description: string
  host_name: string
  format: string
  duration: number
  track: string
  errors: string[]
}

interface ImportResult {
  success: boolean
  title: string
  error?: string
}

const VALID_FORMATS = ['talk', 'workshop', 'discussion', 'panel', 'demo']
const VALID_DURATIONS = [15, 30, 60, 90]

const EXAMPLE_CSV = `title,description,host_name,format,duration,track
"Introduction to Web3","Learn the basics of blockchain technology","Alice Smith","talk",60,"Technical"
"Building DApps Workshop","Hands-on workshop for building decentralized apps","Bob Johnson","workshop",90,"Technical"
"Community Governance Discussion","Open discussion about DAO governance","Carol Williams","discussion",60,"Governance"`

function getAccessToken(): string | null {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
  const stored = localStorage.getItem(storageKey)
  if (stored) {
    try {
      const session = JSON.parse(stored)
      return session?.access_token || null
    } catch {
      return null
    }
  }
  return null
}

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentField.trim())
        currentField = ''
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField.trim())
        if (currentRow.some(f => f)) rows.push(currentRow)
        currentRow = []
        currentField = ''
        if (char === '\r') i++
      } else {
        currentField += char
      }
    }
  }

  // Handle last row
  currentRow.push(currentField.trim())
  if (currentRow.some(f => f)) rows.push(currentRow)

  return rows
}

export function CSVSessionImport({ eventSlug, tracks, onImportComplete }: CSVSessionImportProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [parsedRows, setParsedRows] = React.useState<ParsedRow[]>([])
  const [importResults, setImportResults] = React.useState<ImportResult[]>([])
  const [isImporting, setIsImporting] = React.useState(false)
  const [parseError, setParseError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const trackNameToId = React.useMemo(() => {
    const map = new Map<string, string>()
    tracks.forEach(t => map.set(t.name.toLowerCase(), t.id))
    return map
  }, [tracks])

  const handleFile = (file: File) => {
    setParseError(null)
    setParsedRows([])
    setImportResults([])

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const rows = parseCSV(text)

        if (rows.length < 2) {
          setParseError('CSV must have a header row and at least one data row')
          return
        }

        const headers = rows[0].map(h => h.toLowerCase())
        const requiredHeaders = ['title', 'host_name']
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

        if (missingHeaders.length > 0) {
          setParseError(`Missing required columns: ${missingHeaders.join(', ')}`)
          return
        }

        const titleIdx = headers.indexOf('title')
        const descIdx = headers.indexOf('description')
        const hostIdx = headers.indexOf('host_name')
        const formatIdx = headers.indexOf('format')
        const durationIdx = headers.indexOf('duration')
        const trackIdx = headers.indexOf('track')

        const parsed: ParsedRow[] = rows.slice(1).map((row, idx) => {
          const errors: string[] = []
          const title = row[titleIdx] || ''
          const description = descIdx >= 0 ? (row[descIdx] || '') : ''
          const host_name = row[hostIdx] || ''
          const format = formatIdx >= 0 ? (row[formatIdx] || 'talk').toLowerCase() : 'talk'
          const durationStr = durationIdx >= 0 ? row[durationIdx] : '60'
          const duration = parseInt(durationStr, 10) || 60
          const track = trackIdx >= 0 ? (row[trackIdx] || '') : ''

          if (!title) errors.push('Title is required')
          if (!host_name) errors.push('Host name is required')
          if (format && !VALID_FORMATS.includes(format)) {
            errors.push(`Invalid format "${format}". Valid: ${VALID_FORMATS.join(', ')}`)
          }
          if (duration && !VALID_DURATIONS.includes(duration)) {
            errors.push(`Invalid duration ${duration}. Valid: ${VALID_DURATIONS.join(', ')}`)
          }
          if (track && !trackNameToId.has(track.toLowerCase())) {
            errors.push(`Unknown track "${track}"`)
          }

          return { title, description, host_name, format, duration, track, errors }
        })

        setParsedRows(parsed)
      } catch (err) {
        setParseError('Failed to parse CSV file')
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      handleFile(file)
    } else {
      setParseError('Please upload a CSV file')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.errors.length === 0)
    if (validRows.length === 0) return

    const token = getAccessToken()
    if (!token) {
      setParseError('Session expired. Please log in again.')
      return
    }

    setIsImporting(true)
    const results: ImportResult[] = []

    for (const row of validRows) {
      try {
        const response = await fetch(`/api/v1/events/${eventSlug}/admin/sessions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: row.title,
            description: row.description || null,
            host_name: row.host_name,
            format: row.format || 'talk',
            duration: row.duration || 60,
            track_id: row.track ? trackNameToId.get(row.track.toLowerCase()) : null,
            status: 'approved',
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          results.push({ success: false, title: row.title, error: data.error || 'Failed to create' })
        } else {
          results.push({ success: true, title: row.title })
        }
      } catch {
        results.push({ success: false, title: row.title, error: 'Network error' })
      }
    }

    setImportResults(results)
    setIsImporting(false)

    const successCount = results.filter(r => r.success).length
    if (successCount > 0) {
      onImportComplete(successCount)
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([EXAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sessions_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const validCount = parsedRows.filter(r => r.errors.length === 0).length
  const errorCount = parsedRows.filter(r => r.errors.length > 0).length
  const successCount = importResults.filter(r => r.success).length
  const failCount = importResults.filter(r => !r.success).length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Import Sessions</CardTitle>
        <CardDescription>
          Upload a CSV file to create multiple sessions at once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Download Template</p>
            <p className="text-xs text-muted-foreground">
              Use our template with the correct column format
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>

        {/* CSV Format Info */}
        <div className="text-sm">
          <p className="font-medium mb-2">Required columns:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li><code className="bg-muted px-1 rounded">title</code> - Session title</li>
            <li><code className="bg-muted px-1 rounded">host_name</code> - Speaker name</li>
          </ul>
          <p className="font-medium mt-3 mb-2">Optional columns:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li><code className="bg-muted px-1 rounded">description</code> - Session description</li>
            <li><code className="bg-muted px-1 rounded">format</code> - talk, workshop, discussion, panel, demo</li>
            <li><code className="bg-muted px-1 rounded">duration</code> - 15, 30, 60, or 90 minutes</li>
            <li><code className="bg-muted px-1 rounded">track</code> - Track name (must match existing track)</li>
          </ul>
        </div>

        {/* Drop Zone */}
        {parsedRows.length === 0 && importResults.length === 0 && (
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
              'cursor-pointer'
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Drop your CSV file here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
          </div>
        )}

        {/* Parse Error */}
        {parseError && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {parseError}
          </div>
        )}

        {/* Preview */}
        {parsedRows.length > 0 && importResults.length === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Preview ({parsedRows.length} rows)</p>
                <p className="text-sm text-muted-foreground">
                  {validCount} valid, {errorCount} with errors
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setParsedRows([])}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={validCount === 0 || isImporting}>
                  {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Import {validCount} Sessions
                </Button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
              {parsedRows.map((row, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-3 text-sm',
                    row.errors.length > 0 && 'bg-destructive/5'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{row.title || '(no title)'}</p>
                      <p className="text-muted-foreground text-xs truncate">
                        {row.host_name || '(no host)'} · {row.format} · {row.duration}min
                        {row.track && ` · ${row.track}`}
                      </p>
                    </div>
                    {row.errors.length > 0 ? (
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  {row.errors.length > 0 && (
                    <ul className="mt-2 text-xs text-destructive list-disc list-inside">
                      {row.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import Results */}
        {importResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Import Complete</p>
                <p className="text-sm text-muted-foreground">
                  {successCount} created, {failCount} failed
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setParsedRows([])
                  setImportResults([])
                }}
              >
                Import More
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
              {importResults.map((result, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-3 text-sm flex items-center justify-between gap-4',
                    !result.success && 'bg-destructive/5'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                    <span className="truncate">{result.title}</span>
                  </div>
                  {result.error && (
                    <span className="text-xs text-destructive flex-shrink-0">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
