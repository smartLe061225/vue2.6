/* @flow */

import { addProp } from 'compiler/helpers'

// 仅引用被文件：./index.js
export default function text (el: ASTElement, dir: ASTDirective) {
  if (dir.value) {
    addProp(el, 'textContent', `_s(${dir.value})`, dir)
  }
}
