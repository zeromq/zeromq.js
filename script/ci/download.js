const path = require("path")
const fetch = require("node-fetch")
const gunzip = require("gunzip-maybe")
const tar = require("tar-fs")

async function download() {
  const {
    repository: {url},
    version,
  } = require(path.resolve("./package.json"))

  if (process.env.TRAVIS_TAG && process.env.TRAVIS_TAG != `v${version}`) {
    throw new Error(
      `Version mismatch (TRAVIS_TAG=${process.env.TRAVIS_TAG}, version=${version}`,
    )
  }

  const [, user, repo] = url.match(/\/([\w.-]+)\/([\w.-]+)\.git$/i)

  const res = await fetch(
    `https://api.github.com/repos/${user}/${repo}/releases/tags/v${version}`,
  )

  if (!res.ok) {
    if (res.status == 404) {
      throw new Error(`Github release v${version} not found (${res.status})`)
    } else {
      const body = await res.text()
      throw new Error(
        `Github release v${version} not accessible (${res.status}): ${body}`,
      )
    }
  }

  const {assets} = await res.json()

  await Promise.all(
    assets.map(async ({browser_download_url: url}) => {
      console.log(`Downloading prebuilds from ${url}`)
      const res = await fetch(url)
      return new Promise((resolve, reject) => {
        res.body
          .pipe(gunzip())
          .pipe(tar.extract("."))
          .on("error", reject)
          .on("finish", resolve)
      })
    }),
  )
}

download().catch(err => {
  console.error(err)
  process.exit(1)
})
