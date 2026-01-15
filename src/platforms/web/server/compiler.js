/* @flow */

import { baseOptions } from '../compiler/options'
import { createCompiler } from 'server/optimizing-compiler/index'

const { compile, compileToFunctions } = createCompiler(baseOptions)

export {
  // 仅引用被文件：src/platforms/web/entry-compiler.js
  compile as ssrCompile,
  // 仅引用被文件：src/platforms/web/entry-compiler.js
  // 仅调用被normalizeRender方法：src/server/render.js
  compileToFunctions as ssrCompileToFunctions
}
