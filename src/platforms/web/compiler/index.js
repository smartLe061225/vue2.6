/* @flow */

import { baseOptions } from './options'
import { createCompiler } from 'compiler/index'

const { compile, compileToFunctions } = createCompiler(baseOptions)
// 仅引用被文件：src/platforms/web/entry-compiler.js
// 仅调用被Vue.prototype.$mount方法 & Vue.compile方法：src/platforms/web/entry-runtime-with-compiler.js
export { compile, compileToFunctions }
