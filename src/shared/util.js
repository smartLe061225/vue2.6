/* @flow */

export const emptyObject = Object.freeze({})

// These helpers produce better VM code in JS engines due to their
// explicitness and function inlining.
export function isUndef (v: any): boolean %checks {
  return v === undefined || v === null
}

export function isDef (v: any): boolean %checks {
  return v !== undefined && v !== null
}

export function isTrue (v: any): boolean %checks {
  return v === true
}

export function isFalse (v: any): boolean %checks {
  return v === false
}

/**
 * Check if value is primitive.
 */
export function isPrimitive (value: any): boolean %checks {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    // $flow-disable-line
    typeof value === 'symbol' ||
    typeof value === 'boolean'
  )
}

/**
 * Quick object check - this is primarily used to tell
 * objects from primitive values when we know the value
 * is a JSON-compliant type.
 */
export function isObject (obj: mixed): boolean %checks {
  return obj !== null && typeof obj === 'object'
}
// console.log(typeof 123) // 'number'
// console.log(typeof NaN) // 'number'
// console.log(typeof Infinity) // 'number'
// console.log(typeof 'abc') // 'string'
// console.log(typeof '') // 'string'
// console.log(typeof true) // 'boolean'
// console.log(typeof false) // 'boolean'
// console.log(typeof Symbol(123)) // 'symbol'
// console.log(typeof new Set([1, 2])) // 'object'
// console.log(typeof new Map([[1, 'a'], [2, 'b']])) // 'object'
// console.log(typeof undefined) // 'undefined'
// console.log(typeof null) // 'object'
// console.log(typeof { foo: 42 }) // 'object'
// console.log(typeof []) // 'object'
// console.log(typeof [1, 2]) // 'object'
// console.log(typeof function() {}) // 'function'
// console.log(typeof (() => 12)) // 'function'
// console.log(typeof async function() {}) // 'function'
// console.log(typeof (async () => {})) // 'function'
// console.log(typeof Date) // 'function'
// console.log(typeof new Date()) // 'object'
// console.log(typeof Math) // 'object'
// console.log(typeof Math.abs()) // 'number'
// typeof取值：‘number'/'string'/'boolean'/'symbol'/'object'/'function'

/**
 * Get the raw type string of a value, e.g., [object Object].
 */
const _toString = Object.prototype.toString

export function toRawType (value: any): string {
  return _toString.call(value).slice(8, -1)
}

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 */
export function isPlainObject (obj: any): boolean {
  return _toString.call(obj) === '[object Object]'
}
// function typeCheck(val) {
//   const toString = Object.prototype.toString
//   return toString.call(val).slice(7, -1)
// }
// console.log(typeCheck()) // 'Undefined'
// console.log(typeCheck(123)) // 'Number'
// console.log(typeCheck(NaN)) // 'Number'
// console.log(typeCheck(Infinity)) // 'Number'
// console.log(typeCheck('abc')) // 'String'
// console.log(typeCheck('')) // 'String'
// console.log(typeCheck(true)) // 'Boolean'
// console.log(typeCheck(false)) // 'Boolean'
// console.log(typeCheck(Symbol(123))) // 'Symbol'
// console.log(typeCheck(new Set([1, 2]))) // 'Set'
// console.log(typeCheck(new Map([[1, 'a'], [2, 'b']]))) // 'Map'
// console.log(typeCheck(undefined)) // 'Undefined'
// console.log(typeCheck(null)) // 'Null'
// console.log(typeCheck({ foo: 42 })) // 'Object'
// console.log(typeCheck([])) // 'Array'
// console.log(typeCheck([1, 2])) // 'Array'
// console.log(typeCheck(function() {})) // 'Function'
// console.log(typeCheck(() => 12)) // 'Function'
// console.log(typeCheck(async function() {})) // 'AsyncFunction'
// console.log(typeCheck(async () => {})) // 'AsyncFunction'
// console.log(typeCheck(Date)) // 'Function'
// console.log(typeCheck(new Date())) // 'Date'
// console.log(typeCheck(Math)) // 'Math'
// console.log(typeCheck(Math.abs())) // 'Number'
export function isRegExp (v: any): boolean {
  return _toString.call(v) === '[object RegExp]'
}

/**
 * Check if val is a valid array index.
 */
export function isValidArrayIndex (val: any): boolean {
  const n = parseFloat(String(val))
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}

export function isPromise (val: any): boolean {
  return (
    isDef(val) &&
    typeof val.then === 'function' &&
    typeof val.catch === 'function'
  )
}

/**
 * Convert a value to a string that is actually rendered.
 */
export function toString (val: any): string {
  return val == null
    ? ''
    : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
      ? JSON.stringify(val, null, 2)
      : String(val)
}
// function add(a, b) {
// 	return a + b
// }
// console.log(String()) // ''
// console.log(String(undefined)) // 'undefined'
// console.log(String(null)) // 'null'
// console.log(String(1)) // '1'
// console.log(String(NaN)) // 'NaN'
// console.log(String(Infinity)) // 'Infinity'
// console.log(String(-Infinity)) // '-Infinity'
// console.log(String(true)) // 'true'
// console.log(String(false)) // 'false'
// console.log(String('')) // ''
// console.log(String('abc')) // 'abc'
// console.log(String('123abc')) // '123abc'
// console.log(String('abc123')) // 'abc123'
// console.log(String([])) // ''
// console.log(String([1, 2, 3])) // '1,2,3'
// console.log(String(new Date())) // 'Tue Jan 06 2026 09:59:38 GMT+0800 (中国标准时间)'
// console.log(String(function add(a, b) {
// 	return a + b
// }))
// // `function add(a, b) {
// // 	return a + b
// // }`
// console.log(String({ foo: 42 })) // '[object Object]'
// // 结论：String无法解析数组，对象

// console.log(JSON.stringify()) // "undefined"
// console.log(JSON.stringify(undefined, null, 2)) // "undefined"
// console.log(JSON.stringify(null, null, 2)) // "null"
// console.log(JSON.stringify(1, null, 2)) // "1"
// console.log(JSON.stringify(NaN, null, 2)) // "null"
// console.log(JSON.stringify(Infinity, null, 2)) // "null"
// console.log(JSON.stringify(-Infinity, null, 2)) // "null"
// console.log(JSON.stringify(true, null, 2)) // "true"
// console.log(JSON.stringify(false, null, 2)) // "false"
// console.log(JSON.stringify('', null, 2)) // ""
// console.log(JSON.stringify('abc', null, 2)) // "abc"
// console.log(JSON.stringify('123abc', null, 2)) // "123abc"
// console.log(JSON.stringify('abc123', null, 2)) // "abc123"
// console.log(JSON.stringify([], null, 2)) // "[]"
// console.log(JSON.stringify([1, 2, 3], null, 2)) // 
// // `[
// //   1,
// //   2,
// //   3
// // ]`
// console.log(JSON.stringify(new Date(), null, 2)) // ""2026-01-06T02:11:23.910Z""
// console.log(JSON.stringify(function add(a, b) {
// 	return a + b
// })) // "undefined"
// console.log(JSON.stringify({ foo: 42, bar: { baz: 24, qux: [1, 3, 5] } })) // `{"foo":42,"bar":{"baz":24,"qux":[1,3,5]}}`
// 结论：JSON.stringify无法解析：NaN Infinity -Infinity fn

/**
 * Convert an input value to a number for persistence.
 * If the conversion fails, return original string.
 */
export function toNumber (val: string): number | string {
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
export function makeMap (
  str: string,
  expectsLowerCase?: boolean
): (key: string) => true | void {
  const map = Object.create(null)
  const list: Array<string> = str.split(',')
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase
    ? val => map[val.toLowerCase()]
    : val => map[val]
}

/**
 * Check if a tag is a built-in tag.
 */
export const isBuiltInTag = makeMap('slot,component', true)

/**
 * Check if an attribute is a reserved attribute.
 */
export const isReservedAttribute = makeMap('key,ref,slot,slot-scope,is')

/**
 * Remove an item from an array.
 */
export function remove (arr: Array<any>, item: any): Array<any> | void {
  if (arr.length) {
    const index = arr.indexOf(item)
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}

/**
 * Check whether an object has the property.
 */
const hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwn (obj: Object | Array<*>, key: string): boolean {
  return hasOwnProperty.call(obj, key)
}

/**
 * Create a cached version of a pure function.
 */
export function cached<F: Function> (fn: F): F {
  const cache = Object.create(null)
  return (function cachedFn (str: string) {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }: any)
}

/**
 * Camelize a hyphen-delimited string.
 */
const camelizeRE = /-(\w)/g
export const camelize = cached((str: string): string => {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : '')
})
// const utils = cached(function(val) {
// 	console.log('not cache')
// 	return val.charAt(0).toUpperCase() + val.slice(1)
// })
// utils('abc') // 'not cache' 'Abc'
// utils('abc') // 'Abc'

/**
 * Capitalize a string.
 */
export const capitalize = cached((str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
})

/**
 * Hyphenate a camelCase string.
 */
const hyphenateRE = /\B([A-Z])/g
export const hyphenate = cached((str: string): string => {
  return str.replace(hyphenateRE, '-$1').toLowerCase() // 'AbAb AbAAb'.replace(/\B([A-Z])/g, '-$1') // 'Ab-Ab Ab-A-Ab'
})

/**
 * Simple bind polyfill for environments that do not support it,
 * e.g., PhantomJS 1.x. Technically, we don't need this anymore
 * since native bind is now performant enough in most browsers.
 * But removing it would mean breaking code that was able to run in
 * PhantomJS 1.x, so this must be kept for backward compatibility.
 */

/* istanbul ignore next */
function polyfillBind (fn: Function, ctx: Object): Function {
  function boundFn (a) {
    const l = arguments.length
    return l
      ? l > 1
        ? fn.apply(ctx, arguments)
        : fn.call(ctx, a)
      : fn.call(ctx)
  }

  boundFn._length = fn.length
  return boundFn
}

function nativeBind (fn: Function, ctx: Object): Function {
  return fn.bind(ctx)
}

export const bind = Function.prototype.bind
  ? nativeBind
  : polyfillBind
// function fn(a, b) {
// 	console.log(a, b, this.foo)
// }

// const fnB1 = fn.bind({ foo: 42 })
// fnB1(1, 3) // 1 3 42
// console.log(fn.length, fnB1.length) // 2 2

// const fnB2 = polyfillBind(fn, { foo: 42 })
// fnB2(1, 3) // 1 3 42
// console.log(fn.length, fnB2.length, fnB2._length) // 2 1 2

/**
 * Convert an Array-like object to a real Array.
 */
export function toArray (list: any, start?: number): Array<any> {
  start = start || 0
  let i = list.length - start
  const ret: Array<any> = new Array(i)
  while (i--) {
    ret[i] = list[i + start]
  }
  return ret
}

/**
 * Mix properties into target object.
 */
export function extend (to: Object, _from: ?Object): Object {
  for (const key in _from) {
    to[key] = _from[key]
  }
  return to
}

/**
 * Merge an Array of Objects into a single Object.
 */
export function toObject (arr: Array<any>): Object {
  const res = {}
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      extend(res, arr[i])
    }
  }
  return res
}
// let arr = [
//   { width: '100px', height: '200px' },
//   { width: '200px', margin: '10px' },
//   { padding: '5px' }
// ]
// console.log(toObject(arr)) // { width: '200px', height: '200px', margin: '10px', padding: '5px' }

/* eslint-disable no-unused-vars */

/**
 * Perform no operation.
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
 */
export function noop (a?: any, b?: any, c?: any) {}

/**
 * Always return false.
 */
export const no = (a?: any, b?: any, c?: any) => false

/* eslint-enable no-unused-vars */

/**
 * Return the same value.
 */
export const identity = (_: any) => _

/**
 * Generate a string containing static keys from compiler modules.
 */
export function genStaticKeys (modules: Array<ModuleOptions>): string {
  return modules.reduce((keys, m) => {
    return keys.concat(m.staticKeys || [])
  }, []).join(',')
}
// let modules = [
// 	{ name: 'foo', staticKeys: 'a' },
// 	{ name: 'bar', staticKeys: ['b', 'c'] },
// 	{ name: 'baz' }
// ]
// genStaticKeys(modules) // ['a', 'b', 'c']

/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 */
export function looseEqual (a: any, b: any): boolean {
  if (a === b) return true
  const isObjectA = isObject(a)
  const isObjectB = isObject(b)
  if (isObjectA && isObjectB) {
    try {
      const isArrayA = Array.isArray(a)
      const isArrayB = Array.isArray(b)
      if (isArrayA && isArrayB) {
        return a.length === b.length && a.every((e, i) => {
          return looseEqual(e, b[i])
        })
      } else if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime()
      } else if (!isArrayA && !isArrayB) {
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        return keysA.length === keysB.length && keysA.every(key => {
          return looseEqual(a[key], b[key])
        })
      } else {
        /* istanbul ignore next */
        return false
      }
    } catch (e) {
      /* istanbul ignore next */
      return false
    }
  } else if (!isObjectA && !isObjectB) {
    return String(a) === String(b)
  } else {
    return false
  }
}
// console.log(looseEqual(1, 1)) // true
// console.log(looseEqual(1, [1, 3, 5])) // false
// console.log(looseEqual(1, { foo: 42, bar: 24 })) // false
// console.log(looseEqual([1, 3], 1)) // false
// console.log(looseEqual([1, 3], [1, 3])) // true
// console.log(looseEqual([1, 3], [1, 3, 5])) // false
// console.log(looseEqual([1, 3], { foo: 42, bar: 24 })) // false
// console.log(looseEqual({ foo: 42, bar: 24 }, 1)) // false
// console.log(looseEqual({ foo: 42, bar: 24 }, [1, 3])) // false
// console.log(looseEqual({ foo: 42, bar: 24 }, [1, 3, 5])) // false
// console.log(looseEqual({ foo: 42, bar: 24 }, { foo: 42, })) // false
// console.log(looseEqual({ foo: 42, bar: 24 }, { foo: 42, bar: 24 })) // true
// console.log(JSON.stringify(new Date()) === JSON.stringify(new Date())) // true
// console.log(JSON.stringify(new Date()) === JSON.stringify(new Date())) // true
// console.log(looseEqual(new Date(), new Date())) // true
// console.log(looseEqual(new Date('2026-1-6'), new Date('2026-1-6'))) // true
// console.log(looseEqual(new Date('2026-1-6'), new Date('2026-1-7'))) // false

// console.log(looseEqual(function add(a, b) {
// 	return a + b
// }, function add(a, b) {
// 	return a + b
// })) // true
// console.log(looseEqual(function add(a,  b) {
// 	return a + b
// }, function add(a, b) {
// 	return a + b
// })) // false

/**
 * Return the first index at which a loosely equal value can be
 * found in the array (if value is a plain object, the array must
 * contain an object of the same shape), or -1 if it is not present.
 */
export function looseIndexOf (arr: Array<mixed>, val: mixed): number {
  for (let i = 0; i < arr.length; i++) {
    if (looseEqual(arr[i], val)) return i
  }
  return -1
}

/**
 * Ensure a function is called only once.
 */
export function once (fn: Function): Function {
  let called = false
  return function () {
    if (!called) {
      called = true
      fn.apply(this, arguments) // 保持新函数this指向不变
    }
  }
}
// function add(a, b) {
// 	console.log(a, b, this.foo)
// 	return a + b
// }
// const addOnce = once(add)
// addOnce(1, 3) // 1 3 undefined 4
// addOnce(1, 3) // 

// let obj = {
// 	foo: 42
// }
// let addBind = add.bind(obj)
// let addBindOnce = once(addBind)
// addBindOnce(1, 3) // 1 3 42 4
// addBindOnce(1, 3)

// obj.fn = once(add)
// obj.fn(1, 3) // 1 3 42 4
// obj.fn(1, 3) //
