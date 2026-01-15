/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0
// 仅调用被instance模块主入口文件：src/core/instance/index.js
export function initMixin (Vue: Class<Component>) {
  // 仅调用被构造函数Vue：src/core/instance/index.js
  // 仅调用被构造函数VueComponent：src/core/global-api/extend.js
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++
    // v._uid // 0
    // vm._uid // 1
    // hw1._uid // 2
    // t._uid // 3
    // k._uid // 4
    // hw2._uid // 5

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // 仅在此处进行了赋值操作
    vm._isVue = true
    // v._isVue === true // true
    // vm._isVue === true // true
    // hw1._isVue === true // true
    // t._isVue === true
    // k._isVue === true
    // hw2._isVue === true
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    // v._self === v // true
    // vm._self === vm // true
    // hw1._self === hw1 // true
    // t._self === t // true
    // k._self === k // true
    // hw2._self === hw2 // true
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      // 实例属性_name只在此处进行了赋值
      vm._name = formatComponentName(vm, false)
      // v._name // '<Root>'
      // vm._name // '<App>'
      // hw1._name // '<HelloWorld>'
      // t._name // '<Transition>'
      // k._name // '<KeepAlive>'
      // hw2._name // '<HelloWorld>'
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

// 仅调用被本文件的Vue.prototype._init方法
// 仅调用被VirtualComponent.prototype._init方法：src/platforms/weex/runtime/recycle-list/virtual-component.js
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

// 仅调用被本文件的Vue.prototype._init方法
// 仅调用被VirtualComponent.prototype._init方法：src/platforms/weex/runtime/recycle-list/virtual-component.js
export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}
/**
 * 检测构造器(Ctor)的options自上一次封存(sealedOptions)以来有哪些字段被修改。
 * 作用：
 * - 对比Ctor.options与Ctor.sealedOptions，将所有不同的键收集到一个新的对象并返回(键对应最新的值）。
 * - 用于发现“后期修改/附加”的选项（例如在extend后或运行时对构造函数options的改动），
 * 从而在resolveConstructorOptions中进行相应合并/更新。
 * 行为细节：
 * - 迭代Ctor.options的所有键；
 * - 若某个键在sealedOptions中的值与当前值不同，则将该键和最新值加入返回对象；
 * - 若无任何差异，则返回null。
 *
 * @param {Class<Component>} Ctor - 要检查的组件构造函数，期望其上存在 .options 与 .sealedOptions 字段。
 * @returns {?Object} 包含已修改字段及其最新值的对象（若无修改则返回 null）。
 * @private
 */
function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
