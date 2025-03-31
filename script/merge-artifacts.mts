import fsExtra, {remove} from "fs-extra"
const {readdir, writeFile, readJson, ensureDir, copy} = fsExtra
import glob from "fast-glob"
import {dirname, join} from "path"

/**
 * Merge the artifacts in the build-artifacts directory into the build directory
 */
async function mergeArtifacts(buildArtifactsDir: string) {
  const artifacts = await readdir(buildArtifactsDir)

  const buildFolders = artifacts.filter(f => f.startsWith("build-"))
  const manifestFiles = buildFolders.map(f =>
    join(buildArtifactsDir, f, "manifest.json"),
  )

  await remove("./build")
  await ensureDir("./build")

  // Merge the manifest files
  const mergedManifest: Record<string, string> = {}
  for (const manifestFile of manifestFiles) {
    const manifest = (await readJson(manifestFile)) as Record<string, string>

    for (const [key, value] of Object.entries(manifest)) {
      if (key in mergedManifest) {
        mergedManifest[key] += value
      } else {
        mergedManifest[key] = value
      }
    }
  }
  await writeFile(
    join("./build", "manifest.json"),
    JSON.stringify(mergedManifest),
  )

  // Copy the addons
  await Promise.all(
    buildFolders.map(async buildFolder => {
      const addons = await glob("./**/addon.node", {
        cwd: join(buildArtifactsDir, buildFolder),
        onlyFiles: true,
        absolute: false,
      })

      return Promise.all(
        addons.map(async addon => {
          const target = join("./build", addon)
          await ensureDir(dirname(target))
          const src = join(buildArtifactsDir, buildFolder, addon)

          console.log(`Copying ${src} to ${target}`)
          return await copy(src, target)
        }),
      )
    }),
  )

  await remove(buildArtifactsDir)
}

async function main() {
  const buildArtifactsDir = join(process.cwd(), "build-artifacts")
  await mergeArtifacts(buildArtifactsDir)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
