/* @flow */

import { escape } from '../util'

import {
  isDef,
  isUndef,
  extend
} from 'shared/util'

import {
  isBooleanAttr,
  isEnumeratedAttr,
  isFalsyAttrValue,
  convertEnumeratedValue
} from 'web/util/attrs'

import { isSSRUnsafeAttr } from 'web/server/util'

// 仅引用被文件：./index.js
export default function renderAttrs (node: VNodeWithData): string {
  let attrs = node.data.attrs
  let res = ''

  const opts = node.parent && node.parent.componentOptions
  if (isUndef(opts) || opts.Ctor.options.inheritAttrs !== false) {
    let parent = node.parent
    while (isDef(parent)) {
      // Stop fallthrough in case parent has inheritAttrs option set to false
      if (parent.componentOptions && parent.componentOptions.Ctor.options.inheritAttrs === false) {
        break;
      }
      if (isDef(parent.data) && isDef(parent.data.attrs)) {
        attrs = extend(extend({}, attrs), parent.data.attrs)
      }
      parent = parent.parent
    }
  }

  if (isUndef(attrs)) {
    return res
  }

  for (const key in attrs) {
    if (isSSRUnsafeAttr(key)) {
      continue
    }
    if (key === 'style') {
      // leave it to the style module
      continue
    }
    res += renderAttr(key, attrs[key])
  }
  return res
}
// 仅调用被本文件的renderAttrs方法
// 仅调用被renderDOMProps方法：src/platforms/web/server/modules/dom-props.js
// 仅调用被ssrHelpers属性 & renderAttrs方法 & renderDOMProps方法：src/server/optimizing-compiler/runtime-helpers.js
export function renderAttr (key: string, value: string): string {
  if (isBooleanAttr(key)) {
    if (!isFalsyAttrValue(value)) {
      return ` ${key}="${key}"`
    }
  } else if (isEnumeratedAttr(key)) {
    return ` ${key}="${escape(convertEnumeratedValue(key, value))}"`
  } else if (!isFalsyAttrValue(value)) {
    return ` ${key}="${escape(String(value))}"`
  }
  return ''
}
