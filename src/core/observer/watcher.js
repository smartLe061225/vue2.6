/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  invokeWithErrorHandling,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */

/**
 * Watcher 类 - 解析表达式、收集依赖、监听值变化并触发回调
 * 
 * @class Watcher
 * @description 用于 $watch() API 和指令的实现。支持深度监听、同步执行、懒加载等多种模式。
 * 
 * @property {Component} vm - Vue 组件实例
 * @property {string} expression - 监听的表达式字符串
 * @property {Function} cb - 值变化时的回调函数
 *
 * @property {boolean} deep - 是否进行深度监听
 * @property {boolean} user - 是否为用户定义的 watcher（$watch）
 * @property {boolean} lazy - 是否为懒加载 watcher。
 *   - 作用：控制 watcher 的初始化和求值时机
 *   - 当 lazy=true 时（计算属性 computed）：
 *     1. 初始化时不立即求值，value 初始为 undefined
 *     2. dirty 标志位初始为 true，表示需要重新计算
 *     3. 只有当 dirty=true 时才调用 evaluate() 方法求值
 *     4. 依赖变化时只标记 dirty=true，不立即执行回调
 *   - 当 lazy=false 时：立即求值并执行依赖收集
 * @property {boolean} sync - 是否同步执行更新（不进行批处理）
 * @property {Function} [before] - 生命周期钩子，在 beforeUpdate 中调用
 * @property {number} id - watcher 的唯一标识，用于批处理
 * @property {boolean} active - watcher 是否活跃
 * @property {boolean} dirty - 是否需要重新计算（用于 lazy watcher）
 * @property {Array<Dep>} deps - 当前依赖的 Dep 对象数组
 * @property {Array<Dep>} newDeps - 新收集的依赖数组
 * @property {SimpleSet} depIds - 当前依赖 ID 的集合
 * @property {SimpleSet} newDepIds - 新依赖 ID 的集合
 * @property {Function} getter - 用于获取监听值的函数
 * @property {any} value - watcher 的当前值
 * 
 * @constructor
 * @param {Component} vm - Vue 组件实例
 * @param {string|Function} expOrFn - 监听的表达式或函数
 * @param {Function} cb - 回调函数
 * @param {Object} [options] - 选项对象
 * @param {boolean} [options.deep=false] - 深度监听
 * @param {boolean} [options.user=false] - 是否为用户定义的 watcher
 * @param {boolean} [options.lazy=false] - 是否为懒加载 watcher
 * @param {boolean} [options.sync=false] - 是否同步执行
 * @param {Function} [options.before] - beforeUpdate 生命周期钩子
 * @param {boolean} [isRenderWatcher=false] - 是否为渲染 watcher
 * 
 * @method get - 求值并重新收集依赖
 * @method addDep - 添加依赖
 * @method cleanupDeps - 清理依赖
 * @method update - 依赖变化时的更新接口
 * @method run - 执行 watcher 的回调
 * @method evaluate - 对 lazy watcher 求值
 * @method depend - 收集当前 watcher 的所有依赖
 * @method teardown - 销毁 watcher，移除所有依赖订阅
 */

// 仅调用被mountComponent方法：src/core/instance/lifecycle.js
// 仅调用被initComputed方法：src/core/instance/state.js
// 仅调用被initVirtualComponent方法：src/platforms/weex/runtime/recycle-list/virtual-component.js
// 仅调用被实例方法Vue.prototype.$watch：src/core/instance/state.js
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;

  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  before: ?Function;

  id: number;
  active: boolean;
  dirty: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean // 仅mountComponent方法 & initVirtualComponent方法中设置为true
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
      // v._watcher.id // 1
      // vm._watcher.id // 2
      // hw1._watcher.id // 3
      // t._watcher.id // 4
      // k._watcher.id // 5
      // hw2._watcher.id // 6
    }
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy // 实例属性lazy只在此进行了赋值
      this.sync = !!options.sync
      this.before = options.before // 生命周期钩子beforeUpdate中调用
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers

    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    // 实例方法getter只在此处赋值，且仅调用被get方法
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) { // 当含有非法字符时
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy // 实例属性lazy只在此使用了
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  // 仅被constructor & this.run & this.evaluate方法调用
  get () {
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  // 仅调用被Dep实例对象的depend方法
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  // 仅被this.get方法调用
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()

    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }
  // let s1 = new Set([1, 3, 5])
  // let s2 = new Set([2, 4, 6])

  // s1 = s2
  // console.error(s1, s2) // Set{2, 4, 6} Set{2, 4, 6}
  // s2.clear()
  // console.error(s1, s2) // Set{size: 0} Set{size: 0}

  // let s3 = new Set([1, 3, 5])
  // let s4 = new Set([2, 4, 6])
  // let temp = s3
  // s3 = s4
  // s4 = temp
  // console.error(s3, s4) // Set{2, 4, 6} Set{1, 3, 5}
  // s4.clear()
  // console.error(s3, s4) // Set{2, 4, 6} Set{size: 0}

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  // 仅调用被Dep实例对象的notify方法
  // 仅调用被Vue.prototype.$forceUpdate方法：src/core/instance/lifecycle.js
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  // 仅调用被update方法 & queueWatcher方法 & vm.$forceUpdate方法
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          const info = `callback for watcher "${this.expression}"`
          invokeWithErrorHandling(this.cb, this.vm, [value, oldValue], this.vm, info)
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  // 与实例对象上的depend方法一起被调用
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  // 仅调用被方法defineComputed -> createComputedGetter：src/core/instance/state.js

  // initState -> initComputed -> defineComputed -> createComputedGetter
  // src/core/instance/state.js
  // 用于在实例对象vm上定义计算属性的响应式：(key in vm.$options.computed)
  // Object.defineProperty(vm, key, sharedPropertyDefinition)

  // Vue.extend -> initComputed -> defineComputed -> createComputedGetter
  // src/core/global-api/extend.js
  // 用于在构造函数原型上定义计算属性的响应式：(key in Comp.options.computed)
  // Object.defineProperty(Comp.prototype,, key, sharedPropertyDefinition)
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  // 仅调用被Vue.prototype.$destroy方法：src/core/instance/lifecycle.js
  // 仅调用被Vue.prototype.$watch方法中用于返回一个取消观察函数：src/core/instance/state.js
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
