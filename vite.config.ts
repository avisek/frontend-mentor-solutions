import { defineConfig, send } from 'vite'
import type { Connect, Logger, PluginOption, IndexHtmlTransformHook, ViteDevServer, Plugin, IndexHtmlTransformContext, HtmlTagDescriptor, ResolvedConfig, UserConfig, FSWatcher } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fastGlob from 'fast-glob'
import YAML from 'yaml'
import colors from 'picocolors'
import MagicString from 'magic-string'
import type { DefaultTreeAdapterMap, ParserError, Token } from 'parse5'
import type { RollupError, SourceMap, SourceMapInput } from 'rollup'


const BASE = '/frontend-mentor-solutions/'
const PORT = 3368

const __dirname = fileURLToPath(new URL('.', import.meta.url))


function reroute(url: string): string {
  if (
    url.startsWith('/@') ||
    url.startsWith('/node_modules/') ||
    url.startsWith('/homepage/') ||
    url.startsWith('/solutions/')
  ) {
    return url
  }
  
  const solutionNameRegex = /^\/([^/]+)\//
  const match = url.match(solutionNameRegex)
  if (match) {
    const solutionName = match[1]
    const solutionInnerPath = url.slice(`/${solutionName}/`.length)
    const solutionDir = `/solutions/${solutionName}/`
    const looksLikeFile = /\.[^\/]*$/.test(solutionInnerPath)
    const filename = `${solutionDir.slice(1)}${solutionInnerPath.endsWith('/') ? `${solutionInnerPath}index.html` : solutionInnerPath}`
    const fileExists = fs.existsSync(path.resolve(__dirname, filename))
    return `${solutionDir}${looksLikeFile || fileExists ? solutionInnerPath : ''}`
  }
  
  const innerPath = url.slice(1)
  const dir = `/homepage/`
  const looksLikeFile = /\.[^\/]*$/.test(innerPath)
  const filename = `${dir.slice(1)}${innerPath.endsWith('/') ? `${innerPath}index.html` : innerPath}`
  const fileExists = fs.existsSync(path.resolve(__dirname, filename))
  return `${dir}${looksLikeFile || fileExists ? innerPath : ''}`
}

function router(): PluginOption {
  return {
    name: 'router',
    apply: 'serve',
    configureServer(server) {
      return () => {
        // setTimeout(() => console.log(server.middlewares.stack), 3000)
        
        server.transformIndexHtml = createDevHtmlTransformFn(server)
        
        const viteTransformMiddlewareIndex = server.middlewares.stack.findIndex(
          middleware =>
            (middleware.handle as Connect.ServerHandle & { name: string }).name === 'viteTransformMiddleware'
        )
        server.middlewares.stack.splice(viteTransformMiddlewareIndex, 0, {
          route: '',
          handle: function routerMiddleware_$(req, res, next) {
            req.url = reroute(req.url)
            next()
          }
        })
      }
    }
  }
}


const solutionsYamlPath = path.resolve(__dirname, './solutions.yaml')
const solutionsDir = path.resolve(__dirname, './solutions')

let solutions = {}
let parsedSolutions = {}
let solutionDirnames = []

function validateSolutions(logger?: Logger) {
  const parsedSolutionNames = Object.keys(parsedSolutions)
  const solutionNames = new Set([...parsedSolutionNames, ...solutionDirnames])
  
  solutions = {}
  const logLines = []
  solutionNames.forEach(solutionName => {
    
    if (!parsedSolutionNames.includes(solutionName)) {
      logLines.push(
        colors.red(`⚠  Found solution ./solutions/${colors.bold(solutionName)} has not been added to ./${colors.bold(`solutions.yaml`)}.`)
      )
      solutionNames.delete(solutionName)
      return
    }
    
    const parsedSolution = parsedSolutions[solutionName]
    
    if (!solutionDirnames.includes(solutionName) && !('repoLink' in parsedSolution)) {
      logLines.push(
        colors.red(`⚠  Declared solution "${colors.bold(solutionName)}" in ./${colors.bold(`solutions.yaml`)} not found in ./${colors.bold(`solutions`)} directory.`)
      )
      solutionNames.delete(solutionName)
      return
    }
    
    let {
      title,
      description,
      stacks,
      previewImage,
      challengeLink,
      solutionLink,
      repoLink = `https://github.com/avisek/frontend-mentor-solutions/tree/main/solutions/${solutionName}`,
      liveLink = `https://avisek.github.io/frontend-mentor-solutions/${solutionName}`,
    } = parsedSolution
    
    if (!path.isAbsolute(previewImage)) {
      previewImage = path.posix.join(BASE, solutionName, previewImage)
    }
    
    solutions[solutionName] = {
      title,
      description,
      stacks,
      previewImage,
      challengeLink,
      solutionLink,
      repoLink,
      liveLink,
    }
  })
  
  const logMsg = logLines.join('\n')
  if (logger) {
    logger.error(logMsg, { clear: true })
  } else {
    console.error(logMsg)
  }
}

function solutionsJson(): PluginOption {
  return {
    name: 'solutionsJson',
    
    buildStart() {
      parsedSolutions = YAML.parse(fs.readFileSync(solutionsYamlPath, 'utf8'))
      solutionDirnames = fs.readdirSync(path.resolve(__dirname, './solutions'))
      validateSolutions()
    },
    
    configureServer(server) {
      server.watcher.on('change', filePath => {
        if (filePath !== solutionsYamlPath) return
        parsedSolutions = YAML.parse(fs.readFileSync(filePath, 'utf8'))
        validateSolutions(server.config.logger)
      })
      
      server.watcher.on('addDir', dir => {
        if (solutionsDir !== path.dirname(dir)) return
        const solutionName = path.basename(dir)
        if (!solutionDirnames.includes(solutionName)) {
          solutionDirnames.push(solutionName)
          validateSolutions(server.config.logger)
        }
      })
      
      server.watcher.on('unlinkDir', dir => {
        if (solutionsDir !== path.dirname(dir)) return
        const solutionName = path.basename(dir)
        if (solutionDirnames.includes(solutionName)) {
          const index = solutionDirnames.indexOf(solutionName)
          solutionDirnames.splice(index, 1)
          validateSolutions(server.config.logger)
        }
      })
      
      server.middlewares.use((req, res, next) => {
        if (req.url === `${BASE}solutions.json`) {
          return send(req, res, JSON.stringify(solutions, null, 2), 'json', {
            headers: server.config.server.headers,
          })
        }
        next()
      })
    },
    
    closeBundle() {
      const solutionsJsonPath = path.resolve(__dirname, './dist/solutions.json')
      fs.writeFileSync(solutionsJsonPath, JSON.stringify(solutions))
    },
  }
}


function copyRecursively(src: string, dest: string) {
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    fs.readdirSync(src).forEach(file => {
      copyRecursively(path.join(src, file), path.join(dest, file))
    })
  } else {
    fs.copyFileSync(src, dest)
  }
}

function moveRecursively(src: string, dest: string) {
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    fs.readdirSync(src).forEach(file => {
      moveRecursively(path.join(src, file), path.join(dest, file))
    })
    fs.rmdirSync(src)
  } else {
    fs.renameSync(src, dest)
  }
}


function restructureDist(): PluginOption {
  return {
    name: 'restructureDist',
    apply: 'build',
    
    closeBundle() {
      const distDir = 'dist'
      
      const homepageDir = path.join(distDir, 'homepage')
      moveRecursively(homepageDir, distDir)
      
      const solutionsDir = path.join(distDir, 'solutions')
      moveRecursively(solutionsDir, distDir)
    },
  }
}


function bundleDesignImages(): PluginOption {
  return {
    name: 'bundleDesignImages',
    apply: 'build',
    
    closeBundle() {
      const distDir = path.resolve(__dirname, './dist')
      const solutionDirnames = fs.readdirSync(solutionsDir)
      solutionDirnames.forEach(solutionDirname => {
        const srcDir = path.join(solutionsDir, solutionDirname, 'design')
        if (!fs.existsSync(srcDir)) return
        const destDir = path.join(distDir, solutionDirname, 'design')
        copyRecursively(srcDir, destDir)
      })
    },
  }
}


function add404Html(): PluginOption {
  return {
    name: 'add404Html',
    apply: 'build',
    
    closeBundle() {
      const indexHtmls = fastGlob.globSync('./dist/**/index.html')
      indexHtmls.forEach(indexHtml => {
        const dir = path.dirname(indexHtml)
        fs.copyFileSync(indexHtml, path.join(dir, '404.html'))
      })
    },
  }
}


// https://vitejs.dev/config/
export default defineConfig({
  root: path.resolve(__dirname, './'),
  base: BASE,
  server: {
    port: PORT,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, './dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: fastGlob.globSync([
        './homepage/**/*.html',
        './solutions/*/**/*.html',
      ]),
    },
  },
  resolve: {
    alias: {
      '/DesignReference.ts': path.resolve(__dirname, './homepage/DesignReference.ts'),
    },
  },
  plugins: [
    router(),
    react(),
    solutionsJson(),
    restructureDist(),
    bundleDesignImages(),
    add404Html(),
  ],
})



// `createDevHtmlTransformFn`
// Ported from vite@4.4.5 to modify certain parts


// constants.ts

const CSS_LANGS_RE =
  /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:$|\?)/
//
/**
 * Prefix for resolved fs paths, since windows paths may not be valid as URLs.
 */
const FS_PREFIX = `/@fs/`

/**
 * Prefix for resolved Ids that are not valid browser import specifiers
 */
const VALID_ID_PREFIX = `/@id/`

/**
 * Plugins that use 'virtual modules' (e.g. for helper functions), prefix the
 * module ID with `\0`, a convention from the rollup ecosystem.
 * This prevents other plugins from trying to process the id (like node resolution),
 * and core features like sourcemaps can use this info to differentiate between
 * virtual modules and regular files.
 * `\0` is not a permitted char in import URLs so we have to replace them during
 * import analysis. The id will be decoded back before entering the plugins pipeline.
 * These encoded virtual ids are also prefixed by the VALID_ID_PREFIX, so virtual
 * modules in the browser end up encoded as `/@id/__x00__{id}`
 */
const NULL_BYTE_PLACEHOLDER = `__x00__`

const CLIENT_PUBLIC_PATH = `/@vite/client`


// utils.ts

const windowsSlashRE = /\\/g
function slash(p: string): string {
  return p.replace(windowsSlashRE, '/')
}

/**
 * Prepend `/@id/` and replace null byte so the id is URL-safe.
 * This is prepended to resolved ids that are not valid browser
 * import specifiers by the importAnalysis plugin.
 */
function wrapId(id: string): string {
  return id.startsWith(VALID_ID_PREFIX)
    ? id
    : VALID_ID_PREFIX + id.replace('\0', NULL_BYTE_PLACEHOLDER)
}

/**
 * Undo {@link wrapId}'s `/@id/` and null byte replacements.
 */
function unwrapId(id: string): string {
  return id.startsWith(VALID_ID_PREFIX)
    ? id.slice(VALID_ID_PREFIX.length).replace(NULL_BYTE_PLACEHOLDER, '\0')
    : id
}
//
const isWindows = os.platform() === 'win32'

const VOLUME_RE = /^[A-Z]:/i

function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id)
}

function fsPathFromId(id: string): string {
  const fsPath = normalizePath(
    id.startsWith(FS_PREFIX) ? id.slice(FS_PREFIX.length) : id,
  )
  return fsPath[0] === '/' || fsPath.match(VOLUME_RE) ? fsPath : `/${fsPath}`
}
//
const postfixRE = /[?#].*$/s
function cleanUrl(url: string): string {
  return url.replace(postfixRE, '')
}
//
const knownJsSrcRE = /\.(?:[jt]sx?|m[jt]s|vue|marko|svelte|astro|imba)(?:$|\?)/
const isJSRequest = (url: string): boolean => {
  url = cleanUrl(url)
  if (knownJsSrcRE.test(url)) {
    return true
  }
  if (!path.extname(url) && url[url.length - 1] !== '/') {
    return true
  }
  return false
}
//
const replacePercentageRE = /%/g
function injectQuery(url: string, queryToInject: string): string {
  // encode percents for consistent behavior with pathToFileURL
  // see #2614 for details
  const resolvedUrl = new URL(
    url.replace(replacePercentageRE, '%25'),
    'relative:///',
  )
  const { search, hash } = resolvedUrl
  let pathname = cleanUrl(url)
  pathname = isWindows ? slash(pathname) : pathname
  return `${pathname}?${queryToInject}${search ? `&` + search.slice(1) : ''}${
    hash ?? ''
  }`
}
//
const splitRE = /\r?\n/

const range: number = 2

function posToNumber(
  source: string,
  pos: number | { line: number; column: number },
): number {
  if (typeof pos === 'number') return pos
  const lines = source.split(splitRE)
  const { line, column } = pos
  let start = 0
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    start += lines[i].length + 1
  }
  return start + column
}

function generateCodeFrame(
  source: string,
  start: number | { line: number; column: number } = 0,
  end?: number,
): string {
  start = posToNumber(source, start)
  end = end || start
  const lines = source.split(splitRE)
  let count = 0
  const res: string[] = []
  for (let i = 0; i < lines.length; i++) {
    count += lines[i].length + 1
    if (count >= start) {
      for (let j = i - range; j <= i + range || end > count; j++) {
        if (j < 0 || j >= lines.length) continue
        const line = j + 1
        res.push(
          `${line}${' '.repeat(Math.max(3 - String(line).length, 0))}|  ${
            lines[j]
          }`,
        )
        const lineLength = lines[j].length
        if (j === i) {
          // push underline
          const pad = Math.max(start - (count - lineLength) + 1, 0)
          const length = Math.max(
            1,
            end > count ? lineLength - pad : end - start,
          )
          res.push(`   |  ` + ' '.repeat(pad) + '^'.repeat(length))
        } else if (j > i) {
          if (end > count) {
            const length = Math.max(Math.min(end - count, lineLength), 1)
            res.push(`   |  ` + '^'.repeat(length))
          }
          count += lineLength + 1
        }
      }
      break
    }
  }
  return res.join('\n')
}
//
function ensureWatchedFile(
  watcher: FSWatcher,
  file: string | null,
  root: string,
): void {
  if (
    file &&
    // only need to watch if out of root
    !file.startsWith(root + '/') &&
    // some rollup plugins use null bytes for private resolved Ids
    !file.includes('\0') &&
    fs.existsSync(file)
  ) {
    // resolve file to normalized system path
    watcher.add(path.resolve(file))
  }
}

interface ImageCandidate {
  url: string
  descriptor: string
}
const escapedSpaceCharacters = /( |\\t|\\n|\\f|\\r)+/g
const imageSetUrlRE = /^(?:[\w\-]+\(.*?\)|'.*?'|".*?"|\S*)/
function reduceSrcset(ret: { url: string; descriptor: string }[]) {
  return ret.reduce((prev, { url, descriptor }, index) => {
    descriptor ??= ''
    return (prev +=
      url + ` ${descriptor}${index === ret.length - 1 ? '' : ', '}`)
  }, '')
}

function splitSrcSetDescriptor(srcs: string): ImageCandidate[] {
  return splitSrcSet(srcs)
    .map((s) => {
      const src = s.replace(escapedSpaceCharacters, ' ').trim()
      const [url] = imageSetUrlRE.exec(src) || ['']

      return {
        url,
        descriptor: src?.slice(url.length).trim(),
      }
    })
    .filter(({ url }) => !!url)
}

function processSrcSetSync(
  srcs: string,
  replacer: (arg: ImageCandidate) => string,
): string {
  return reduceSrcset(
    splitSrcSetDescriptor(srcs).map(({ url, descriptor }) => ({
      url: replacer({ url, descriptor }),
      descriptor,
    })),
  )
}

const cleanSrcSetRE =
  /(?:url|image|gradient|cross-fade)\([^)]*\)|"([^"]|(?<=\\)")*"|'([^']|(?<=\\)')*'/g
function splitSrcSet(srcs: string) {
  const parts: string[] = []
  // There could be a ',' inside of url(data:...), linear-gradient(...) or "data:..."
  const cleanedSrcs = srcs.replace(cleanSrcSetRE, blankReplacer)
  let startIndex = 0
  let splitIndex: number
  do {
    splitIndex = cleanedSrcs.indexOf(',', startIndex)
    parts.push(
      srcs.slice(startIndex, splitIndex !== -1 ? splitIndex : undefined),
    )
    startIndex = splitIndex + 1
  } while (splitIndex !== -1)
  return parts
}
//
function arraify<T>(target: T | T[]): T[] {
  return Array.isArray(target) ? target : [target]
}
//
const blankReplacer = (match: string): string => ' '.repeat(match.length)
//
function joinUrlSegments(a: string, b: string): string {
  if (!a || !b) {
    return a || b || ''
  }
  if (a[a.length - 1] === '/') {
    a = a.substring(0, a.length - 1)
  }
  if (b[0] !== '/') {
    b = '/' + b
  }
  return a + b
}
//
function stripBase(path: string, base: string): string {
  if (path === base) {
    return '/'
  }
  const devBase = base[base.length - 1] === '/' ? base : base + '/'
  return path.startsWith(devBase) ? path.slice(devBase.length - 1) : path
}


// env.ts

function resolveEnvPrefix({
  envPrefix = 'VITE_',
}: UserConfig): string[] {
  envPrefix = arraify(envPrefix)
  if (envPrefix.some((prefix) => prefix === '')) {
    throw new Error(
      `envPrefix option contains value '', which could lead unexpected exposure of sensitive information.`,
    )
  }
  return envPrefix
}


// plugins/optimizedDeps.ts

const ERR_OUTDATED_OPTIMIZED_DEP = 'ERR_OUTDATED_OPTIMIZED_DEP'


// plugins/asset.ts

function checkPublicFile(
  url: string,
  { publicDir }: ResolvedConfig,
): string | undefined {
  // note if the file is in /public, the resolver would have returned it
  // as-is so it's not going to be a fully resolved path.
  if (!publicDir || url[0] !== '/') {
    return
  }
  const publicFile = path.join(publicDir, cleanUrl(url))
  if (!publicFile.startsWith(publicDir)) {
    // can happen if URL starts with '../'
    return
  }
  if (fs.existsSync(publicFile)) {
    return publicFile
  } else {
    return
  }
}


// plugins/asset.ts

const isCSSRequest = (request: string): boolean =>
  CSS_LANGS_RE.test(request)


// plugins/html.ts

const importMapRE =
  /[ \t]*<script[^>]*type\s*=\s*(?:"importmap"|'importmap'|importmap)[^>]*>.*?<\/script>/is
const moduleScriptRE =
  /[ \t]*<script[^>]*type\s*=\s*(?:"module"|'module'|module)[^>]*>/i
const modulePreloadLinkRE =
  /[ \t]*<link[^>]*rel\s*=\s*(?:"modulepreload"|'modulepreload'|modulepreload)[\s\S]*?\/>/i
const importMapAppendRE = new RegExp(
  [moduleScriptRE, modulePreloadLinkRE].map((r) => r.source).join('|'),
  'i',
)
//
// HTML Proxy Caches are stored by config -> filePath -> index
const htmlProxyMap = new WeakMap<
  ResolvedConfig,
  Map<string, Array<{ code: string; map?: SourceMapInput }>>
>()

function addToHTMLProxyCache(
  config: ResolvedConfig,
  filePath: string,
  index: number,
  result: { code: string; map?: SourceMapInput },
): void {
  if (!htmlProxyMap.get(config)) {
    htmlProxyMap.set(config, new Map())
  }
  if (!htmlProxyMap.get(config)!.get(filePath)) {
    htmlProxyMap.get(config)!.set(filePath, [])
  }
  htmlProxyMap.get(config)!.get(filePath)![index] = result
}
//
// this extends the config in @vue/compiler-sfc with <link href>
const assetAttrsConfig: Record<string, string[]> = {
  link: ['href'],
  video: ['src', 'poster'],
  source: ['src', 'srcset'],
  img: ['src', 'srcset'],
  image: ['xlink:href', 'href'],
  use: ['xlink:href', 'href'],
}

function nodeIsElement(
  node: DefaultTreeAdapterMap['node'],
): node is DefaultTreeAdapterMap['element'] {
  return node.nodeName[0] !== '#'
}

function traverseNodes(
  node: DefaultTreeAdapterMap['node'],
  visitor: (node: DefaultTreeAdapterMap['node']) => void,
) {
  visitor(node)
  if (
    nodeIsElement(node) ||
    node.nodeName === '#document' ||
    node.nodeName === '#document-fragment'
  ) {
    node.childNodes.forEach((childNode) => traverseNodes(childNode, visitor))
  }
}

async function traverseHtml(
  html: string,
  filePath: string,
  visitor: (node: DefaultTreeAdapterMap['node']) => void,
): Promise<void> {
  // lazy load compiler
  const { parse } = await import('parse5')
  const ast = parse(html, {
    scriptingEnabled: false, // parse inside <noscript>
    sourceCodeLocationInfo: true,
    onParseError: (e: ParserError) => {
      handleParseError(e, html, filePath)
    },
  })
  traverseNodes(ast, visitor)
}

function getScriptInfo(node: DefaultTreeAdapterMap['element']): {
  src: Token.Attribute | undefined
  sourceCodeLocation: Token.Location | undefined
  isModule: boolean
  isAsync: boolean
} {
  let src: Token.Attribute | undefined
  let sourceCodeLocation: Token.Location | undefined
  let isModule = false
  let isAsync = false
  for (const p of node.attrs) {
    if (p.prefix !== undefined) continue
    if (p.name === 'src') {
      if (!src) {
        src = p
        sourceCodeLocation = node.sourceCodeLocation?.attrs!['src']
      }
    } else if (p.name === 'type' && p.value && p.value === 'module') {
      isModule = true
    } else if (p.name === 'async') {
      isAsync = true
    }
  }
  return { src, sourceCodeLocation, isModule, isAsync }
}
//
const attrValueStartRE = /=\s*(.)/

function overwriteAttrValue(
  s: MagicString,
  sourceCodeLocation: Token.Location,
  newValue: string,
): MagicString {
  const srcString = s.slice(
    sourceCodeLocation.startOffset,
    sourceCodeLocation.endOffset,
  )
  const valueStart = srcString.match(attrValueStartRE)
  if (!valueStart) {
    // overwrite attr value can only be called for a well-defined value
    throw new Error(
      `[vite:html] internal error, failed to overwrite attribute value`,
    )
  }
  const wrapOffset = valueStart[1] === '"' || valueStart[1] === "'" ? 1 : 0
  const valueOffset = valueStart.index! + valueStart[0].length - 1
  s.update(
    sourceCodeLocation.startOffset + valueOffset + wrapOffset,
    sourceCodeLocation.endOffset - wrapOffset,
    newValue,
  )
  return s
}

/**
 * Format parse5 @type {ParserError} to @type {RollupError}
 */
function formatParseError(parserError: ParserError, id: string, html: string) {
  const formattedError = {
    code: parserError.code,
    message: `parse5 error code ${parserError.code}`,
    frame: generateCodeFrame(html, parserError.startOffset),
    loc: {
      file: id,
      line: parserError.startLine,
      column: parserError.startCol,
    },
  } satisfies RollupError
  return formattedError
}
//
function handleParseError(
  parserError: ParserError,
  html: string,
  filePath: string,
) {
  switch (parserError.code) {
    case 'missing-doctype':
      // ignore missing DOCTYPE
      return
    case 'abandoned-head-element-child':
      // Accept elements without closing tag in <head>
      return
    case 'duplicate-attribute':
      // Accept duplicate attributes #9566
      // The first attribute is used, browsers silently ignore duplicates
      return
    case 'non-void-html-element-start-tag-with-trailing-solidus':
      // Allow self closing on non-void elements #10439
      return
  }
  const parseError = formatParseError(parserError, filePath, html)
  throw new Error(
    `Unable to parse HTML; ${parseError.message}\n` +
      ` at ${parseError.loc.file}:${parseError.loc.line}:${parseError.loc.column}\n` +
      `${parseError.frame}`,
  )
}
//
function preImportMapHook(
  config: ResolvedConfig,
): IndexHtmlTransformHook {
  return (html, ctx) => {
    const importMapIndex = html.match(importMapRE)?.index
    if (importMapIndex === undefined) return

    const importMapAppendIndex = html.match(importMapAppendRE)?.index
    if (importMapAppendIndex === undefined) return

    if (importMapAppendIndex < importMapIndex) {
      const relativeHtml = normalizePath(
        path.relative(config.root, ctx.filename),
      )
      config.logger.warnOnce(
        colors.yellow(
          colors.bold(
            `(!) <script type="importmap"> should come before <script type="module"> and <link rel="modulepreload"> in /${relativeHtml}`,
          ),
        ),
      )
    }
  }
}

/**
 * Move importmap before the first module script and modulepreload link
 */
function postImportMapHook(): IndexHtmlTransformHook {
  return (html) => {
    if (!importMapAppendRE.test(html)) return

    let importMap: string | undefined
    html = html.replace(importMapRE, (match) => {
      importMap = match
      return ''
    })

    if (importMap) {
      html = html.replace(
        importMapAppendRE,
        (match) => `${importMap}\n${match}`,
      )
    }

    return html
  }
}

/**
 * Support `%ENV_NAME%` syntax in html files
 */
function htmlEnvHook(config: ResolvedConfig): IndexHtmlTransformHook {
  const pattern = /%(\S+?)%/g
  const envPrefix = resolveEnvPrefix({ envPrefix: config.envPrefix })
  const env: Record<string, any> = { ...config.env }
  // account for user env defines
  for (const key in config.define) {
    if (key.startsWith(`import.meta.env.`)) {
      const val = config.define[key]
      env[key.slice(16)] = typeof val === 'string' ? val : JSON.stringify(val)
    }
  }
  return (html, ctx) => {
    return html.replace(pattern, (text, key) => {
      if (key in env) {
        return env[key]
      } else {
        if (envPrefix.some((prefix) => key.startsWith(prefix))) {
          const relativeHtml = normalizePath(
            path.relative(config.root, ctx.filename),
          )
          config.logger.warn(
            colors.yellow(
              colors.bold(
                `(!) ${text} is not defined in env variables found in /${relativeHtml}. ` +
                  `Is the variable mistyped?`,
              ),
            ),
          )
        }

        return text
      }
    })
  }
}

function resolveHtmlTransforms(
  plugins: readonly Plugin[],
): [
  IndexHtmlTransformHook[],
  IndexHtmlTransformHook[],
  IndexHtmlTransformHook[],
] {
  const preHooks: IndexHtmlTransformHook[] = []
  const normalHooks: IndexHtmlTransformHook[] = []
  const postHooks: IndexHtmlTransformHook[] = []

  for (const plugin of plugins) {
    const hook = plugin.transformIndexHtml
    if (!hook) continue

    if (typeof hook === 'function') {
      normalHooks.push(hook)
    } else {
      // `enforce` had only two possible values for the `transformIndexHtml` hook
      // `'pre'` and `'post'` (the default). `order` now works with three values
      // to align with other hooks (`'pre'`, normal, and `'post'`). We map
      // both `enforce: 'post'` to `order: undefined` to avoid a breaking change
      const order = hook.order ?? (hook.enforce === 'pre' ? 'pre' : undefined)
      // @ts-expect-error union type
      const handler = hook.handler ?? hook.transform
      if (order === 'pre') {
        preHooks.push(handler)
      } else if (order === 'post') {
        postHooks.push(handler)
      } else {
        normalHooks.push(handler)
      }
    }
  }

  return [preHooks, normalHooks, postHooks]
}

async function applyHtmlTransforms(
  html: string,
  hooks: IndexHtmlTransformHook[],
  ctx: IndexHtmlTransformContext,
): Promise<string> {
  for (const hook of hooks) {
    const res = await hook(html, ctx)
    if (!res) {
      continue
    }
    if (typeof res === 'string') {
      html = res
    } else {
      let tags: HtmlTagDescriptor[]
      if (Array.isArray(res)) {
        tags = res
      } else {
        html = res.html || html
        tags = res.tags
      }

      const headTags: HtmlTagDescriptor[] = []
      const headPrependTags: HtmlTagDescriptor[] = []
      const bodyTags: HtmlTagDescriptor[] = []
      const bodyPrependTags: HtmlTagDescriptor[] = []

      for (const tag of tags) {
        if (tag.injectTo === 'body') {
          bodyTags.push(tag)
        } else if (tag.injectTo === 'body-prepend') {
          bodyPrependTags.push(tag)
        } else if (tag.injectTo === 'head') {
          headTags.push(tag)
        } else {
          headPrependTags.push(tag)
        }
      }

      html = injectToHead(html, headPrependTags, true)
      html = injectToHead(html, headTags)
      html = injectToBody(html, bodyPrependTags, true)
      html = injectToBody(html, bodyTags)
    }
  }

  return html
}

const headInjectRE = /([ \t]*)<\/head>/i
const headPrependInjectRE = /([ \t]*)<head[^>]*>/i

const htmlInjectRE = /<\/html>/i
const htmlPrependInjectRE = /([ \t]*)<html[^>]*>/i

const bodyInjectRE = /([ \t]*)<\/body>/i
const bodyPrependInjectRE = /([ \t]*)<body[^>]*>/i

const doctypePrependInjectRE = /<!doctype html>/i

function injectToHead(
  html: string,
  tags: HtmlTagDescriptor[],
  prepend = false,
) {
  if (tags.length === 0) return html

  if (prepend) {
    // inject as the first element of head
    if (headPrependInjectRE.test(html)) {
      return html.replace(
        headPrependInjectRE,
        (match, p1) => `${match}\n${serializeTags(tags, incrementIndent(p1))}`,
      )
    }
  } else {
    // inject before head close
    if (headInjectRE.test(html)) {
      // respect indentation of head tag
      return html.replace(
        headInjectRE,
        (match, p1) => `${serializeTags(tags, incrementIndent(p1))}${match}`,
      )
    }
    // try to inject before the body tag
    if (bodyPrependInjectRE.test(html)) {
      return html.replace(
        bodyPrependInjectRE,
        (match, p1) => `${serializeTags(tags, p1)}\n${match}`,
      )
    }
  }
  // if no head tag is present, we prepend the tag for both prepend and append
  return prependInjectFallback(html, tags)
}

function injectToBody(
  html: string,
  tags: HtmlTagDescriptor[],
  prepend = false,
) {
  if (tags.length === 0) return html

  if (prepend) {
    // inject after body open
    if (bodyPrependInjectRE.test(html)) {
      return html.replace(
        bodyPrependInjectRE,
        (match, p1) => `${match}\n${serializeTags(tags, incrementIndent(p1))}`,
      )
    }
    // if no there is no body tag, inject after head or fallback to prepend in html
    if (headInjectRE.test(html)) {
      return html.replace(
        headInjectRE,
        (match, p1) => `${match}\n${serializeTags(tags, p1)}`,
      )
    }
    return prependInjectFallback(html, tags)
  } else {
    // inject before body close
    if (bodyInjectRE.test(html)) {
      return html.replace(
        bodyInjectRE,
        (match, p1) => `${serializeTags(tags, incrementIndent(p1))}${match}`,
      )
    }
    // if no body tag is present, append to the html tag, or at the end of the file
    if (htmlInjectRE.test(html)) {
      return html.replace(htmlInjectRE, `${serializeTags(tags)}\n$&`)
    }
    return html + `\n` + serializeTags(tags)
  }
}

function prependInjectFallback(html: string, tags: HtmlTagDescriptor[]) {
  // prepend to the html tag, append after doctype, or the document start
  if (htmlPrependInjectRE.test(html)) {
    return html.replace(htmlPrependInjectRE, `$&\n${serializeTags(tags)}`)
  }
  if (doctypePrependInjectRE.test(html)) {
    return html.replace(doctypePrependInjectRE, `$&\n${serializeTags(tags)}`)
  }
  return serializeTags(tags) + html
}

const unaryTags = new Set(['link', 'meta', 'base'])

function serializeTag(
  { tag, attrs, children }: HtmlTagDescriptor,
  indent: string = '',
): string {
  if (unaryTags.has(tag)) {
    return `<${tag}${serializeAttrs(attrs)}>`
  } else {
    return `<${tag}${serializeAttrs(attrs)}>${serializeTags(
      children,
      incrementIndent(indent),
    )}</${tag}>`
  }
}

function serializeTags(
  tags: HtmlTagDescriptor['children'],
  indent: string = '',
): string {
  if (typeof tags === 'string') {
    return tags
  } else if (tags && tags.length) {
    return tags.map((tag) => `${indent}${serializeTag(tag, indent)}\n`).join('')
  }
  return ''
}

function serializeAttrs(attrs: HtmlTagDescriptor['attrs']): string {
  let res = ''
  for (const key in attrs) {
    if (typeof attrs[key] === 'boolean') {
      res += attrs[key] ? ` ${key}` : ``
    } else {
      res += ` ${key}=${JSON.stringify(attrs[key])}`
    }
  }
  return res
}

function incrementIndent(indent: string = '') {
  return `${indent}${indent[0] === '\t' ? '\t' : '  '}`
}

function getAttrKey(attr: Token.Attribute): string {
  return attr.prefix === undefined ? attr.name : `${attr.prefix}:${attr.name}`
}


// server/pluginContainer.ts

const ERR_CLOSED_SERVER = 'ERR_CLOSED_SERVER'


// server/sourcemap.ts

// Virtual modules should be prefixed with a null byte to avoid a
// false positive "missing source" warning. We also check for certain
// prefixes used for special handling in esbuildDepPlugin.
const virtualSourceRE = /^(?:dep:|browser-external:|virtual:)|\0/

interface SourceMapLike {
  sources: string[]
  sourcesContent?: (string | null)[]
  sourceRoot?: string
}

async function injectSourcesContent(
  map: SourceMapLike,
  file: string,
  logger: Logger,
): Promise<void> {
  let sourceRoot: string | undefined
  try {
    // The source root is undefined for virtual modules and permission errors.
    sourceRoot = await fsp.realpath(
      path.resolve(path.dirname(file), map.sourceRoot || ''),
    )
  } catch {}

  const missingSources: string[] = []
  const sourcesContent = map.sourcesContent || []
  await Promise.all(
    map.sources.map(async (sourcePath, index) => {
      let content = null
      if (sourcePath && !virtualSourceRE.test(sourcePath)) {
        sourcePath = decodeURI(sourcePath)
        if (sourceRoot) {
          sourcePath = path.resolve(sourceRoot, sourcePath)
        }
        // inject content from source file when sourcesContent is null
        content =
          sourcesContent[index] ??
          (await fsp.readFile(sourcePath, 'utf-8').catch(() => {
            missingSources.push(sourcePath)
            return null
          }))
      }
      sourcesContent[index] = content
    }),
  )

  map.sourcesContent = sourcesContent

  // Use this command…
  //    DEBUG="vite:sourcemap" vite build
  // …to log the missing sources.
  if (missingSources.length) {
    logger.warnOnce(`Sourcemap for "${file}" points to missing source files`)
    // debug?.(`Missing sources:\n  ` + missingSources.join(`\n  `))                               // [Debug code commented]
  }
}

function genSourceMapUrl(map: SourceMap | string): string {
  if (typeof map !== 'string') {
    map = JSON.stringify(map)
  }
  return `data:application/json;base64,${Buffer.from(map).toString('base64')}`
}

function getCodeWithSourcemap(
  type: 'js' | 'css',
  code: string,
  map: SourceMap,
): string {
  // if (debug) {                                                                                  // [Debug code commented]
  //   code += `\n/*${JSON.stringify(map, null, 2).replace(/\*\//g, '*\\/')}*/\n`                  // [Debug code commented]
  // }                                                                                             // [Debug code commented]

  if (type === 'js') {
    code += `\n//# sourceMappingURL=${genSourceMapUrl(map)}`
  } else if (type === 'css') {
    code += `\n/*# sourceMappingURL=${genSourceMapUrl(map)} */`
  }

  return code
}


// server/middlewares/indexHtml.ts

interface AssetNode {
  start: number
  end: number
  code: string
}

export function createDevHtmlTransformFn(
  server: ViteDevServer,
): (url: string, html: string, originalUrl: string) => Promise<string> {
  const [preHooks, normalHooks, postHooks] = resolveHtmlTransforms(
    server.config.plugins,
  )
  return (url: string, html: string, originalUrl: string): Promise<string> => {
    return applyHtmlTransforms(
      html,
      [
        preImportMapHook(server.config),
        ...preHooks,
        htmlEnvHook(server.config),
        devHtmlHook,
        ...normalHooks,
        ...postHooks,
        postImportMapHook(),
      ],
      {
        path: url,
        filename: getHtmlFilename(url, server),
        server,
        originalUrl,
      },
    )
  }
}

function getHtmlFilename(url: string, server: ViteDevServer) {
  if (url.startsWith(FS_PREFIX)) {
    return decodeURIComponent(fsPathFromId(url))
  } else {
    return decodeURIComponent(
      normalizePath(path.join(server.config.root, url.slice(1))),
    )
  }
}

function shouldPreTransform(url: string, config: ResolvedConfig) {
  return (
    !checkPublicFile(url, config) && (isJSRequest(url) || isCSSRequest(url))
  )
}

const processNodeUrl = (
  attr: Token.Attribute,
  sourceCodeLocation: Token.Location,
  s: MagicString,
  config: ResolvedConfig,
  htmlPath: string,
  originalUrl?: string,
  server?: ViteDevServer,
) => {
  let url = attr.value || ''

  if (server?.moduleGraph) {
    const mod = server.moduleGraph.urlToModuleMap.get(url)
    if (mod && mod.lastHMRTimestamp > 0) {
      url = injectQuery(url, `t=${mod.lastHMRTimestamp}`)
    }
  }
  const devBase = config.base
  const solutionRE = /^\/solutions\/([^/]+)\/index.html$/                                          // [Added]
  let solutionMatch: RegExpMatchArray                                                              // [Added]
  if (url[0] === '/' && url[1] !== '/') {
    // prefix with base (dev only, base is never relative)
    const fullUrl = path.posix.join(devBase, url)
    overwriteAttrValue(s, sourceCodeLocation, fullUrl)
    if (server && shouldPreTransform(url, config)) {
      preTransformRequest(server, fullUrl, devBase)
    }
  } else if (
    url[0] === '.' &&
    originalUrl &&
    originalUrl !== '/' &&
    // htmlPath === '/index.html'                                                                  // [Before]
    (htmlPath === '/index.html' || htmlPath === '/homepage/index.html' || (solutionMatch = htmlPath.match(solutionRE))) // [Modified]
  ) {
    // prefix with base (dev only, base is never relative)
    const replacer = (url: string) => {
      // const fullUrl = path.posix.join(devBase, url)                                             // [Before]
      const fullUrl = path.posix.join(devBase, path.posix.dirname(htmlPath), url)                  // [Modified]
      if (server && shouldPreTransform(url, config)) {
        preTransformRequest(server, fullUrl, devBase)
      }
      // return fullUrl                                                                            // [Before]
      return path.posix.join(devBase, solutionMatch?.[1] ?? '', url)                               // [Modified]
    }

    // #3230 if some request url (localhost:3000/a/b) return to fallback html, the relative assets
    // path will add `/a/` prefix, it will caused 404.
    // rewrite before `./index.js` -> `localhost:5173/a/index.js`.
    // rewrite after `../index.js` -> `localhost:5173/index.js`.

    const processedUrl =
      attr.name === 'srcset' && attr.prefix === undefined
        ? processSrcSetSync(url, ({ url }) => replacer(url))
        : replacer(url)
    overwriteAttrValue(s, sourceCodeLocation, processedUrl)
  }
}

const devHtmlHook: IndexHtmlTransformHook = async (
  html,
  { path: htmlPath, filename, server, originalUrl },
) => {
  const { config, moduleGraph, watcher } = server!
  const base = config.base || '/'
  htmlPath = decodeURI(htmlPath)

  let proxyModulePath: string
  let proxyModuleUrl: string

  const trailingSlash = htmlPath.endsWith('/')
  if (!trailingSlash && fs.existsSync(filename)) {
    proxyModulePath = htmlPath
    proxyModuleUrl = joinUrlSegments(base, htmlPath)
  } else {
    // There are users of vite.transformIndexHtml calling it with url '/'
    // for SSR integrations #7993, filename is root for this case
    // A user may also use a valid name for a virtual html file
    // Mark the path as virtual in both cases so sourcemaps aren't processed
    // and ids are properly handled
    const validPath = `${htmlPath}${trailingSlash ? 'index.html' : ''}`
    proxyModulePath = `\0${validPath}`
    proxyModuleUrl = wrapId(proxyModulePath)
  }

  const s = new MagicString(html)
  let inlineModuleIndex = -1
  const proxyCacheUrl = cleanUrl(proxyModulePath).replace(
    normalizePath(config.root),
    '',
  )
  const styleUrl: AssetNode[] = []

  const addInlineModule = (
    node: DefaultTreeAdapterMap['element'],
    ext: 'js',
  ) => {
    inlineModuleIndex++

    const contentNode = node.childNodes[0] as DefaultTreeAdapterMap['textNode']

    const code = contentNode.value

    let map: SourceMapInput | undefined
    if (proxyModulePath[0] !== '\0') {
      map = new MagicString(html)
        .snip(
          contentNode.sourceCodeLocation!.startOffset,
          contentNode.sourceCodeLocation!.endOffset,
        )
        .generateMap({ hires: true })
      map.sources = [filename]
      map.file = filename
    }

    // add HTML Proxy to Map
    addToHTMLProxyCache(config, proxyCacheUrl, inlineModuleIndex, { code, map })

    // inline js module. convert to src="proxy" (dev only, base is never relative)
    const modulePath = `${proxyModuleUrl}?html-proxy&index=${inlineModuleIndex}.${ext}`

    // invalidate the module so the newly cached contents will be served
    const module = server?.moduleGraph.getModuleById(modulePath)
    if (module) {
      server?.moduleGraph.invalidateModule(module)
    }
    s.update(
      node.sourceCodeLocation!.startOffset,
      node.sourceCodeLocation!.endOffset,
      `<script type="module" src="${modulePath}"></script>`,
    )
    preTransformRequest(server!, modulePath, base)
  }

  await traverseHtml(html, filename, (node) => {
    if (!nodeIsElement(node)) {
      return
    }

    // script tags
    if (node.nodeName === 'script') {
      const { src, sourceCodeLocation, isModule } = getScriptInfo(node)

      if (src) {
        processNodeUrl(
          src,
          sourceCodeLocation!,
          s,
          config,
          htmlPath,
          originalUrl,
          server,
        )
      } else if (isModule && node.childNodes.length) {
        addInlineModule(node, 'js')
      }
    }

    if (node.nodeName === 'style' && node.childNodes.length) {
      const children = node.childNodes[0] as DefaultTreeAdapterMap['textNode']
      styleUrl.push({
        start: children.sourceCodeLocation!.startOffset,
        end: children.sourceCodeLocation!.endOffset,
        code: children.value,
      })
    }

    // elements with [href/src] attrs
    const assetAttrs = assetAttrsConfig[node.nodeName]
    if (assetAttrs) {
      for (const p of node.attrs) {
        const attrKey = getAttrKey(p)
        if (p.value && assetAttrs.includes(attrKey)) {
          processNodeUrl(
            p,
            node.sourceCodeLocation!.attrs![attrKey],
            s,
            config,
            htmlPath,
            originalUrl,
          )
        }
      }
    }
  })

  await Promise.all(
    styleUrl.map(async ({ start, end, code }, index) => {
      const url = `${proxyModulePath}?html-proxy&direct&index=${index}.css`

      // ensure module in graph after successful load
      const mod = await moduleGraph.ensureEntryFromUrl(url, false)
      ensureWatchedFile(watcher, mod.file, config.root)

      const result = await server!.pluginContainer.transform(code, mod.id!)
      let content = ''
      if (result) {
        if (result.map) {
          if (result.map.mappings) {
            await injectSourcesContent(
              result.map,
              proxyModulePath,
              config.logger,
            )
          }
          content = getCodeWithSourcemap('css', result.code, result.map)
        } else {
          content = result.code
        }
      }
      s.overwrite(start, end, content)
    }),
  )

  html = s.toString()

  return {
    html,
    tags: [
      {
        tag: 'script',
        attrs: {
          type: 'module',
          src: path.posix.join(base, CLIENT_PUBLIC_PATH),
        },
        injectTo: 'head-prepend',
      },
    ],
  }
}
//
function preTransformRequest(server: ViteDevServer, url: string, base: string) {
  if (!server.config.server.preTransformRequests) return

  url = unwrapId(stripBase(url, base))
  url = reroute(url)                                                                               // [Added]

  // transform all url as non-ssr as html includes client-side assets only
  server.transformRequest(url).catch((e) => {
    if (
      e?.code === ERR_OUTDATED_OPTIMIZED_DEP ||
      e?.code === ERR_CLOSED_SERVER
    ) {
      // these are expected errors
      return
    }
    // Unexpected error, log the issue but avoid an unhandled exception
    server.config.logger.error(e.message)
  })
}
