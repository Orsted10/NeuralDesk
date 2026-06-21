import { NextResponse } from 'next/server'
import os from 'os'

export async function GET() {
  try {
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const ramPercent = Math.round((usedMem / totalMem) * 100)
    const ramGB = Math.round(usedMem / 1024 / 1024 / 1024)
    
    const cpus = os.cpus()
    
    // Calculate CPU usage (simplified average)
    let totalIdle = 0
    let totalTick = 0
    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += (cpu.times as any)[type]
      }
      totalIdle += cpu.times.idle
    })
    const idle = totalIdle / cpus.length
    const total = totalTick / cpus.length
    const cpuPercent = Math.round(100 - ~~(100 * idle / total))

    return NextResponse.json({
      cpu: cpuPercent,
      ram: ramGB,
      ramPercent: ramPercent,
      platform: os.platform(),
      uptime: os.uptime()
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
