import { NextRequest, NextResponse } from 'next/server'

// CORS headers for Desktop Electron app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// Language ID mapping for Judge0 CE
const JUDGE0_LANGS: Record<string, number> = {
  python: 71,
  javascript: 63,
  typescript: 74,
  cpp: 54,
  c: 50,
  java: 62,
  rust: 73,
  go: 60,
  bash: 46,
  ruby: 72,
  php: 68,
  swift: 83,
  kotlin: 78,
  csharp: 51,
}

export async function POST(req: NextRequest) {
  try {
    const { code, language } = await req.json()
    const langId = JUDGE0_LANGS[language] || 71

    // Try Judge0 CE public instance (free, no key, high rate limit)
    const judge0Url = 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true'
    
    // Also try alternative free Judge0 CE instance
    const altJudge0Url = 'https://api.judge0.com/submissions?base64_encoded=false&wait=true'

    let result = null
    let error = null

    // Attempt 1: Public Judge0 CE (api.judge0.com) — no key required
    try {
      const res = await fetch(altJudge0Url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language_id: langId, source_code: code }),
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        result = await res.json()
      }
    } catch (e: any) {
      error = e.message
    }

    // Attempt 2: Sphere Engine / Glot.io fallback
    if (!result) {
      const glotLangMap: Record<string, string> = {
        python: 'python', javascript: 'javascript', typescript: 'typescript',
        cpp: 'cpp', c: 'c', rust: 'rust', go: 'go', java: 'java', bash: 'bash',
        ruby: 'ruby', php: 'php'
      }
      const extMap: Record<string, string> = {
        python: 'py', javascript: 'js', typescript: 'ts', cpp: 'cpp',
        c: 'c', rust: 'rs', go: 'go', java: 'java', bash: 'sh', ruby: 'rb', php: 'php'
      }
      const glotLang = glotLangMap[language] || 'python'
      const ext = extMap[language] || 'py'
      
      try {
        const res = await fetch(`https://glot.io/api/run/${glotLang}/latest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: [{ name: `main.${ext}`, content: code }] }),
          signal: AbortSignal.timeout(15000),
        })
        if (res.ok) {
          const data = await res.json()
          return NextResponse.json({
            stdout: data.stdout || '',
            stderr: data.stderr || data.error || '',
            success: !data.error && !data.stderr,
          }, { headers: corsHeaders })
        }
      } catch (e: any) {
        error = e.message
      }
    }

    if (result) {
      return NextResponse.json({
        stdout: result.stdout || '',
        stderr: result.stderr || result.compile_output || '',
        status: result.status?.description || 'Done',
        success: result.status?.id <= 3,
      }, { headers: corsHeaders })
    }

    return NextResponse.json({ 
      stdout: '', 
      stderr: `Execution engines unavailable. Error: ${error}`,
      success: false 
    }, { status: 200, headers: corsHeaders })

  } catch (e: any) {
    return NextResponse.json({ stderr: e.message, stdout: '', success: false }, { status: 500, headers: corsHeaders })
  }
}
