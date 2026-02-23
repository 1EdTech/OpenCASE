#!/usr/bin/env node

import { cp, mkdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const outputArg = process.argv[2]
const outputDir = outputArg
  ? path.resolve(projectRoot, outputArg)
  : path.resolve(projectRoot, 'dist/case-assets-bundle')

const filesToCopy = [
  'schemas/case-v1p0-cfpackage.json',
  'schemas/case-v1p0-cfdocument.json',
  'schemas/case-v1p0-cfitem.json',
  'schemas/case-v1p0-cfassociation.json',
  'schemas/case-v1p1-cfpackage.json',
  'schemas/case-v1p1-cfdocument.json',
  'schemas/case-v1p1-cfitem.json',
  'schemas/case-v1p1-cfassociation.json',
  'schemas/official/case-v1p1-cfpackage.json',
  'schemas/README.md',
  'src/infrastructure/validation/JsonSchemaValidator.ts',
  'src/domain/case/entities/CFPackage.ts',
  'src/domain/case/entities/CFDocument.ts',
  'src/domain/case/entities/CFItem.ts',
  'src/domain/case/entities/CFAssociation.ts',
  'src/domain/case/entities/CFRubric.ts',
  'src/domain/case/value-objects/Identifiers.ts',
  'src/domain/case/value-objects/LinkData.ts',
]

async function ensureFileExists(relativePath) {
  const absolutePath = path.resolve(projectRoot, relativePath)
  try {
    const fileStat = await stat(absolutePath)
    if (!fileStat.isFile()) {
      throw new Error(`Path is not a file: ${relativePath}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Required file not found: ${relativePath} (${message})`)
  }
}

async function copyAsset(relativePath) {
  const sourcePath = path.resolve(projectRoot, relativePath)
  const destinationPath = path.resolve(outputDir, relativePath)
  await mkdir(path.dirname(destinationPath), { recursive: true })
  await cp(sourcePath, destinationPath)
}

function createBundleReadme(files) {
  return [
    '# CASE Shared Assets Bundle',
    '',
    'This folder is generated from `apps/opencase` and is intended to be copied into another project.',
    '',
    '## Included',
    '- CASE v1p0 and v1p1 JSON schemas',
    '- Official v1p1 CFPackage schema override',
    '- OpenCASE AJV validator implementation',
    '- CASE domain entity and value-object TypeScript files used by validation workflows',
    '',
    '## Source command',
    '`npm run export:case-assets`',
    '',
    '## Files',
    ...files.map((file) => `- \`${file}\``),
    '',
  ].join('\n')
}

async function main() {
  console.log(`Exporting CASE assets to: ${outputDir}`)

  for (const file of filesToCopy) {
    await ensureFileExists(file)
  }

  await rm(outputDir, { recursive: true, force: true })
  await mkdir(outputDir, { recursive: true })

  for (const file of filesToCopy) {
    await copyAsset(file)
    console.log(`  copied ${file}`)
  }

  const manifestPath = path.resolve(outputDir, 'manifest.json')
  const bundleReadmePath = path.resolve(outputDir, 'README.md')
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceProject: 'apps/opencase',
    files: filesToCopy,
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  await writeFile(bundleReadmePath, createBundleReadme(filesToCopy), 'utf8')

  console.log(`Wrote ${path.relative(projectRoot, manifestPath)}`)
  console.log(`Wrote ${path.relative(projectRoot, bundleReadmePath)}`)
  console.log('CASE asset export complete.')
}

try {
  await main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`CASE asset export failed: ${message}`)
  process.exitCode = 1
}
