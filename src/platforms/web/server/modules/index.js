import attrs from './attrs'
import domProps from './dom-props'
import klass from './class'
import style from './style'

// 仅调用被createRenderer方法：src/platforms/web/entry-server-renderer.js
// 仅调用被createBasicRenderer方法：src/platforms/web/entry-server-basic-renderer.js
export default [
  attrs,
  domProps,
  klass,
  style
]
