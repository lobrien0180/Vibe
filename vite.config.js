import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const httpsKeyPath = resolve('.cert/dev-key.pem')
const httpsCertPath = resolve('.cert/dev-cert.pem')
const shouldUseHttps =
  process.env.VIBE_HTTPS === 'true' &&
  existsSync(httpsKeyPath) &&
  existsSync(httpsCertPath)

function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') {
    return '/'
  }

  const trimmedBasePath = basePath.replace(/^\/+|\/+$/g, '')
  return `/${trimmedBasePath}/`
}

function getBasePath() {
  if (process.env.VITE_BASE_PATH) {
    return normalizeBasePath(process.env.VITE_BASE_PATH)
  }

  if (process.env.GITHUB_ACTIONS === 'true') {
    const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]

    if (repositoryName && !repositoryName.endsWith('.github.io')) {
      return normalizeBasePath(repositoryName)
    }
  }

  return '/'
}

// https://vite.dev/config/
export default defineConfig({
  base: getBasePath(),
  plugins: [react()],
  server: {
    https: shouldUseHttps
      ? {
          key: readFileSync(httpsKeyPath),
          cert: readFileSync(httpsCertPath),
        }
      : false,
  },
})
