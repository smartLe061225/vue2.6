import attrs from './attrs'
import klass from './class'
import events from './events'
import domProps from './dom-props'
import style from './style'
import transition from './transition'

// 仅使用被modules数组：src/platforms/web/runtime/patch.js
export default [
  attrs,
  klass,
  events,
  domProps,
  style,
  transition
]
