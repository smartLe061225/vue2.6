/* @flow */

import { isDef, isObject } from 'shared/util'

// const childVnode = {
//   data: {
//     staticClass: 'child-static',
//     class: 'child-dynamic'
//   },
//   componentInstance: {
//     _vnode: {
//       data: {
//         staticClass: 'parent-static',
//         class: null
//       }
//     }
//   }
// }
// genClassForVnode(childVnode) // 'child-static parent-static child-dynamic'

// 生成 vnode 的 class 字符串
export function genClassForVnode (vnode: VNodeWithData): string {
  let data = vnode.data
  let parentNode = vnode
  let childNode = vnode
  while (isDef(childNode.componentInstance)) {
    childNode = childNode.componentInstance._vnode
    if (childNode && childNode.data) {
      data = mergeClassData(childNode.data, data)
    }
  }
  while (isDef(parentNode = parentNode.parent)) {
    if (parentNode && parentNode.data) {
      data = mergeClassData(data, parentNode.data)
    }
  }
  return renderClass(data.staticClass, data.class)
}
function mergeClassData (child: VNodeData, parent: VNodeData): {
  staticClass: string,
  class: any
} {
  return {
    staticClass: concat(child.staticClass, parent.staticClass),
    class: isDef(child.class)
      ? [child.class, parent.class]
      : parent.class
  }
}
export function renderClass (
  staticClass: ?string,
  dynamicClass: any
): string {
  if (isDef(staticClass) || isDef(dynamicClass)) {
    return concat(staticClass, stringifyClass(dynamicClass))
  }
  /* istanbul ignore next */
  return ''
}
// 以空格连接两个字符串
export function concat (a: ?string, b: ?string): string {
  return a
    ? b
      ? (a + ' ' + b)
      : a
    : (b || '')
}
// 将动态class进行字符串化
export function stringifyClass (value: any): string {
  if (Array.isArray(value)) {
    return stringifyArray(value)
  }
  if (isObject(value)) {
    return stringifyObject(value)
  }
  if (typeof value === 'string') {
    return value
  }
  /* istanbul ignore next */
  return ''
}
// let cl1= 'foo bar'
// let cl2 = ['foo', 'bar']
// let cl3 = { foo: true, bar: true }
// let cl4 = ['foo', 'bar', ['baz', 'qux'], { quux: true, corge: true }]
// stringifyClass(cl1) // 'foo bar'
// stringifyClass(cl2) // 'foo bar'
// stringifyClass(cl3) // 'foo bar'
// stringifyClass(cl4) // 'foo bar baz qux quux corge'
// 将数组中的每一项转换成字符串并以空格连接
function stringifyArray (value: Array<any>): string {
  let res = ''
  let stringified
  for (let i = 0, l = value.length; i < l; i++) {
    if (isDef(stringified = stringifyClass(value[i])) && stringified !== '') {
      if (res) res += ' '
      res += stringified
    }
  }
  return res
}
// 将对象的key以空格连接成字符串，value为真的key才会被连接
function stringifyObject (value: Object): string {
  let res = ''
  for (const key in value) {
    if (value[key]) {
      if (res) res += ' '
      res += key
    }
  }
  return res
}
// let obj = {
// 	a: undefined,
// 	b: null,
// 	c: 0,
// 	d: NaN,
// 	e: Infinity,
// 	f: false,
// 	g: '',
// 	foo: 'hello',
// 	bar: [1, 3, 5],
// 	baz: function(a, b) {
// 		return a + b
// 	},
// 	qux: { x: 11 }

// }
// stringifyObject(obj) // 'e foo bar baz qux'