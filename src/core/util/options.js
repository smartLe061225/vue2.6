/* @flow */

import config from '../config'
import { warn } from './debug'
import { set } from '../observer/index'
import { unicodeRegExp } from './lang'
import { nativeWatch, hasSymbol } from './env'

import {
  ASSET_TYPES,
  LIFECYCLE_HOOKS
} from 'shared/constants'

import {
  extend,
  hasOwn,
  camelize,
  toRawType,
  capitalize,
  isBuiltInTag,
  isPlainObject
} from 'shared/util'

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
const strats = config.optionMergeStrategies

/**
 * Options with restrictions
 */
if (process.env.NODE_ENV !== 'production') {
  // 非生产环境下， 修改选项el和选项propsData的合并策略会静默失败
  strats.el = strats.propsData = function (parent, child, vm, key) {
    if (!vm) {
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    return defaultStrat(parent, child)
  }
}

/**
 * Helper that recursively merges two data objects together.
 */
// 仅被本文件中的mergeDataOrFn函数调用
function mergeData (to: Object, from: ?Object): Object {
  if (!from) return to
  let key, toVal, fromVal

  const keys = hasSymbol
    ? Reflect.ownKeys(from)
    : Object.keys(from)

  for (let i = 0; i < keys.length; i++) {
    key = keys[i]
    // in case the object is already observed...
    if (key === '__ob__') continue
    toVal = to[key]
    fromVal = from[key]
    if (!hasOwn(to, key)) {
      // 若目标对象to没有该属性，则直接赋值到目标对象to上
      set(to, key, fromVal)
    } else if (
      toVal !== fromVal &&
      isPlainObject(toVal) &&
      isPlainObject(fromVal)
    ) {
      // 若目标对象to和源对象from的该属性值均为纯对象，则递归合并该属性值对象
      // { foo: { bar: 24 } } vs { foo: { bar: 24, baz: 36 } }
      mergeData(toVal, fromVal)
    } else {
      // 若目标对象to和源对象from的该属性值相等
      // 若目标对象to和源对象from的该属性值不相等，且该属性值均非纯对象
      // 若目标对象to和源对象from的该属性值不相等，且该属性值中有一个非纯对象
      // 则直接使用目标对象to上的该属性值
      // { foo: 42 } vs { foo: 42 }
      // { foo: { bar: 24 } } vs { foo: { bar: 24 } }
      // { foo: 42 } vs { foo: 24 }
      // { foo: 42 } vs { foo: { bar: 24 } }
    }
  }
  return to
}
/**
 * Data
 */
// 选项data和选项provide的合并策略
// 原则：将目标对象中属性值合并到源对象中，若属性值均为纯对象则递归合并该属性值对象
export function mergeDataOrFn (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    return function mergedDataFn () {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  } else {
    return function mergedInstanceDataFn () {
      // instance merge
      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm, vm)
        : childVal
      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm, vm)
        : parentVal
      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
        return defaultData
      }
    }
  }
}
strats.data = function (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    if (childVal && typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )

      return parentVal
    }
    return mergeDataOrFn(parentVal, childVal)
  }

  return mergeDataOrFn(parentVal, childVal, vm)
}
strats.provide = mergeDataOrFn

// 仅调用被本文件中的mergeHook函数
// 去重目标对象生命周期钩子函数数组中的重复函数 & 去重源对象生命周期钩子函数数组中的重复函数
function dedupeHooks (hooks) {
  const res = []
  for (let i = 0; i < hooks.length; i++) {
    if (res.indexOf(hooks[i]) === -1) {
      res.push(hooks[i])
    }
  }
  return res
}
/**
 * Hooks and props are merged as arrays.
 */
// 生命周期钩子函数的合并策略
// 原则：将目标对象和源对象对应的生命周期钩子函数合并为一个数组
function mergeHook (
  parentVal: ?Array<Function>,
  childVal: ?Function | ?Array<Function>
): ?Array<Function> {
  const res = childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
  return res
    ? dedupeHooks(res)
    : res
}
LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */
// 资源选项(components/directives/filters)的合并策略
// 原则：只获取子选项中的资源选项
function mergeAssets (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): Object {
  const res = Object.create(parentVal || null)
  if (childVal) {
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm)
    return extend(res, childVal)
  } else {
    return res
  }
}
ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */
// 监听器的合并策略
// 原则：将目标对象和源对象对应的监听器合并为一个数组
strats.watch = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  // work around Firefox's Object.prototype.watch...
  if (parentVal === nativeWatch) parentVal = undefined
  if (childVal === nativeWatch) childVal = undefined
  /* istanbul ignore if */
  if (!childVal) return Object.create(parentVal || null)
  if (process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal
  const ret = {}
  extend(ret, parentVal)
  for (const key in childVal) {
    let parent = ret[key]
    const child = childVal[key]
    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    ret[key] = parent
      ? parent.concat(child)
      : Array.isArray(child) ? child : [child]
  }
  return ret
}

/**
 * Other object hashes.
 */
strats.props =
strats.methods =
strats.inject =
strats.computed = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  if (childVal && process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal
  const ret = Object.create(null)
  extend(ret, parentVal)
  if (childVal) extend(ret, childVal)
  return ret
}

function assertObjectType (name: string, value: any, vm: ?Component) {
  if (!isPlainObject(value)) {
    warn(
      `Invalid value for option "${name}": expected an Object, ` +
      `but got ${toRawType(value)}.`,
      vm
    )
  }
}

/**
 * Default strategy.
 */
const defaultStrat = function (parentVal: any, childVal: any): any {
  return childVal === undefined // 若有子选项则使用父选项，否则使用子选项
    ? parentVal
    : childVal
}

/**
 * Validate component names
 */
function checkComponents (options: Object) {
  for (const key in options.components) {
    validateComponentName(key)
  }
}
export function validateComponentName (name: string) {
  // 'a-.12_abAB.34aA_-'.replace(new RegExp(`^[a-zA-Z][\\-\\.0-9_a-zA-Z]*$`, 'g'), '=') // '='
  if (!new RegExp(`^[a-zA-Z][\\-\\.0-9_${unicodeRegExp.source}]*$`).test(name)) {
    warn(
      'Invalid component name: "' + name + '". Component names ' +
      'should conform to valid custom element name in html5 specification.'
    )
  }
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
      'id: ' + name
    )
  }
}
/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
function normalizeProps (options: Object, vm: ?Component) {
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  options.props = res
}
// // 简单语法
// Vue.component('props-demo-simple', {
//   props: ['size', 'myMessage']
// })
// // 对象语法，提供验证
// Vue.component('props-demo-advanced', {
//   props: {
//     // 检测类型
//     height: Number,
//     // 检测类型 + 其他验证
//     age: {
//       type: Number,
//       default: 0,
//       required: true,
//       validator: function (value) {
//         return value >= 0
//       }
//     }
//   }
// })
/**
 * Normalize all injections into Object-based format
 */
function normalizeInject (options: Object, vm: ?Component) {
  const inject = options.inject
  if (!inject) return
  const normalized = options.inject = {}
  if (Array.isArray(inject)) {
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] }
    }
  } else if (isPlainObject(inject)) {
    for (const key in inject) {
      const val = inject[key]
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` +
      `but got ${toRawType(inject)}.`,
      vm
    )
  }
}
// 示例1：
// let s1 = Symbol('11')
// let s2 = Symbol('22')
// let s3 = Symbol('33')
// var obj = {
//   s1: 1,
//   s2,
//   s3: s3,
//   s4: s3,
//   [s1]: 2,
//   [s2]: s2,
//   s5: [s3]
// }
// {
// 	s1: 1,
// 	s2: Symbol(22),
// 	s3: Symbol(33),
// 	s4: Symbol(33),
// 	s5: [Symbol(33)],
// 	Symbol(11): 2,
// 	Symbol(22): Symbol(22),
// }
// console.log(obj.s1, obj.s2, obj.s3, obj.s4, obj[s1], obj[s2]) // 1 Symbol(22) Symbol(33) Symbol(33) 2 Symbol(22)
// 总结：s = Symbol()作为一个类似字符串的常量，当作为属性名时采用[s]，作为属性值时采用s
// 示例2：
// const s1 = Symbol()
// const s2 = Symbol()
// const s3 = Symbol()
// const s4 = Symbol()
// function render(h) {
//   return h('ul', [
//     h('li', this.foo),
//     h('li', this.bar),
//     h('li', this.baz),
//     h('li', this.s1),
//     h('li', this.s2),
//     h('li', this.s3),
//     h('li', this.s4),
//   ])
// }
// const Child1 = {
//   inject: { foo: 'foo', bar: 'bar', baz: 'bar', s1, s2: s2, s4: s3},
//   render,
// }
// const Child2 = {
//   inject: {
//     foo: { from: 'foo' },
//     bar: { from: 'bar' },
//     baz: { from: 'bar' },
//     s1: { from: s1 },
//     s2: { from: s2 },
//     s4: { from: s3 },
//   },
//   render,
// }
// const Child3 = {
//   inject: {
//     foo: { default: 'foo' },
//     bar: { default: 'bar' },
//     baz: { default: 'bar' },
//     s1: { default: s1 },
//     s2: { default: s2 },
//     s4: { default: s3 },
//   },
//   render,
// }
// const Child4 = {
//   // inject: ['foo', 'bar', 'baz', s1, s2, s3, s4],
//   inject: ['foo', 'bar', 'baz', s1, s2, s3],
//   render,
// }
// export default {
//   components: {
//     HelloWorld,
//     Child1,
//     Child2,
//     Child3,
//     Child4,
//   },
//   render(h) {
//     return h('div', { style: { display: 'flex' } }, [
//       h(Child1),
//       h(Child2),
//       h(Child3),
//       h(Child4),
//     ])
//   },
//   provide() {
//     return {
//       foo: 42,
//       bar: 24,
//       [s1]: '11',
//       [s2]: '22',
//       [s3]: '33',
//     }
//   }
// }
/**
 * Normalize raw function directives into object format.
 */
function normalizeDirectives (options: Object) {
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }
}
/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */
export function mergeOptions (
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  if (process.env.NODE_ENV !== 'production') {
    checkComponents(child)
  }

  if (typeof child === 'function') {
    child = child.options
  }

  normalizeProps(child, vm)
  normalizeInject(child, vm)
  normalizeDirectives(child)

  // Apply extends and mixins on the child options,
  // but only if it is a raw options object that isn't
  // the result of another mergeOptions call.
  // Only merged options has the _base property.
  if (!child._base) {
    if (child.extends) {
      parent = mergeOptions(parent, child.extends, vm)
    }
    if (child.mixins) {
      for (let i = 0, l = child.mixins.length; i < l; i++) {
        parent = mergeOptions(parent, child.mixins[i], vm)
      }
    }
  }

  const options = {}
  let key
  for (key in parent) {
    mergeField(key)
  }
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  function mergeField (key) {
    const strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
export function resolveAsset (
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  const assets = options[type]
  // check local registration variations first
  if (hasOwn(assets, id)) return assets[id]
  const camelizedId = camelize(id)
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  const PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  // fallback to prototype chain
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
