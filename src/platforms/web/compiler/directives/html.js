/* @flow */

import { addProp } from 'compiler/helpers'

// 仅引用被文件：./index.js
export default function html (el: ASTElement, dir: ASTDirective) {
  if (dir.value) {
    addProp(el, 'innerHTML', `_s(${dir.value})`, dir)
  }
}
