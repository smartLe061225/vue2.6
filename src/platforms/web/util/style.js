/* @flow */

import { cached, extend, toObject } from 'shared/util'

export const parseStyleText = cached(function (cssText) {
  const res = {}
  // 'ab)de'.replace(/[^(]*/g, '=') // '=='
  // 'ab)de'.replace(/[^(]*\)/g, '=') // '=de'
  // 'ab)de)'.replace(/[^(]*\)/g, '=') // '='
  // ';(ab;((cd;()gh;ab;abc(;abc)'.replace(/;(?![^(]*\))/g, '=') // '=(ab=((cd=()gh=ab=abc(;abc)'
  const listDelimiter = /;(?![^(]*\))/g
  const propertyDelimiter = /:(.+)/
  cssText.split(listDelimiter).forEach(function (item) {
    if (item) {
      const tmp = item.split(propertyDelimiter)
      tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim())
    }
  })
  return res
})
// parseStyleText('') // {}
// parseStyleText('a: x; b: y;') // { a: 'x', b: 'y' }
// parseStyleText('background-color: red; border-width: 1px') // { 'background-color': 'red', 'border-width': '1px' }
// parseStyleText('background: url(image.png); color: red') // { 'background': 'url(image.png)', 'color': 'red' }
// parseStyleText('background-image: url(http://www.example.com/a.png); color: red;') // { 'background-image': 'url(http://www.example.com/a.png)', color: 'red' }
// parseStyleText('font-size: 14px; line-height: 1.5;') // { 'font-size': '14px', 'line-height': '1.5' }
// parseStyleText('content: "a:b"; color: red') // { 'content': '"a:b"', 'color': 'red' }
// parseStyleText('  a  :  x  ;  b  :  y  ') // { a: 'x', b: 'y' }

// normalize possible array / string values into Object
export function normalizeStyleBinding (bindingStyle: any): ?Object {
  if (Array.isArray(bindingStyle)) {
    return toObject(bindingStyle)
  }
  if (typeof bindingStyle === 'string') {
    return parseStyleText(bindingStyle)
  }
  return bindingStyle
}
// let bindingStyle = [
//   { width: '100px', height: '200px' },
//   { width: '200px', margin: '10px' },
//   { padding: '5px' }
// ]
// toObject(bindingStyle) // { width: '200px', height: '200px', margin: '10px', padding: '5px' }


// let st = { width: '100px', height: '200px' }
// let st1 = [{ width: '100px' }, { height: '200px' }]
// normalizeStyleBinding(st) // { width: '100px', height: '200px' }
// normalizeStyleBinding(st1) // { width: '100px', height: '200px' }

// merge static and dynamic style data on the same vnode
function normalizeStyleData (data: VNodeData): ?Object {
  const style = normalizeStyleBinding(data.style)
  // static style is pre-processed into an object during compilation
  // and is always a fresh object, so it's safe to merge into it
  return data.staticStyle
    ? extend(data.staticStyle, style)
    : style
}

/**
 * parent component style should be after child's
 * so that parent component's style could override it
 */
export function getStyle (vnode: VNodeWithData, checkChild: boolean): Object {
  const res = {}
  let styleData

  if (checkChild) {
    let childNode = vnode
    while (childNode.componentInstance) {
      childNode = childNode.componentInstance._vnode
      if (
        childNode && childNode.data &&
        (styleData = normalizeStyleData(childNode.data))
      ) {
        extend(res, styleData)
      }
    }
  }

  if ((styleData = normalizeStyleData(vnode.data))) {
    extend(res, styleData)
  }

  let parentNode = vnode
  while ((parentNode = parentNode.parent)) {
    if (parentNode.data && (styleData = normalizeStyleData(parentNode.data))) {
      extend(res, styleData)
    }
  }
  return res
}
