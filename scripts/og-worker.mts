// Draws a share of the cards for build-og-images.mts: each into the cache, then copied into dist/og.

import { copyFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { workerData } from 'node:worker_threads'
import type { EclipseSummary } from '../src/data/types.ts'
import { defaultCard, eclipseCard, renderPng } from './og-card.mts'

export interface Job {
  id: string
  key: string
  /** Absent for the home page's card. */
  eclipse?: EclipseSummary
}
export interface WorkerInput {
  jobs: Job[]
  outDir: string
  cacheDir: string
}

const { jobs, outDir, cacheDir } = workerData as WorkerInput
for (const job of jobs) {
  const png = await renderPng(job.eclipse ? eclipseCard(job.eclipse) : defaultCard())
  const cached = join(cacheDir, `${job.key}.png`)
  // Write then rename, so a build killed mid-write never leaves a broken card in the cache.
  await writeFile(`${cached}.${process.pid}.tmp`, png)
  await rename(`${cached}.${process.pid}.tmp`, cached)
  await copyFile(cached, join(outDir, `${job.id}.png`))
}
