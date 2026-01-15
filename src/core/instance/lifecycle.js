/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import { mark, measure } from '../util/perf'
import { createEmptyVNode } from '../vdom/vnode'
import { updateComponentListeners } from './events'
import { resolveSlots } from './render-helpers/resolve-slots'
import { toggleObserving } from '../observer/index'
import { pushTarget, popTarget } from '../observer/dep'

import {
  warn,
  noop,
  remove,
  emptyObject,
  validateProp,
  invokeWithErrorHandling
} from '../util/index'

export let activeInstance: any = null
export function setActiveInstance(vm: Component) {
  const prevActiveInstance = activeInstance // prev为内部私有常量，只在执行外部函数时唯一确定
  activeInstance = vm
  return () => {
    activeInstance = prevActiveInstance
  }
}
// 生成的内层函数用于记住执行外层函数前的值：
// 执行外层函数之后，cur为执行外层函数时传入的参数值，pre为执行外城函数前cur值
// 执行内层函数之后，cur和pre均为执行外城函数前cur值，多次执行也不会改变此结果
// let cur = 0
// function outer(val) {
//   const prev = cur // prev为内部私有常量，只在执行外部函数时唯一确定
//   cur = val
//   return function inner() {
//     cur = prev
//   }
// }

// let r1 = outer(1) // 1 0
// console.log(cur) // 1
// r1()
// console.log(cur) // 0 
// r1()
// console.log(cur) // 0

// let r2 = outer(2) // 2 0
// console.log(cur) // 2
// let r3 = outer(3) // 3 2
// console.log(cur) // 3
// r2()
// console.log(cur) // 0
// r2()
// console.log(cur) // 0
// r3()
// console.log(cur) // 2
// r3()
// console.log(cur) // 2

// let r4 = outer(4) // 4 2
// console.log(cur) // 4
// r4()
// console.log(cur) // 2
// r4()
// console.log(cur) // 2
// let r5 = outer(5) // 5 2
// r5()
// console.log(cur) // 2
// r5()
// console.log(cur) // 2

// 仅在vm实例化时调用：vm__init -> initLifecycle
export function initLifecycle (vm: Component) {
  const options = vm.$options

// const HelloWorld = {
//   name: 'HelloWorld',
//   props: {
//     msg: String,
//   },
//   data(val) {
//     if (!window.hw1) {
//       window.hw1 = this
//       window.HW2 = this.constructor
//     } else {
//       window.hw2 = this
//       window.HW2 = this.constructor
//     }
//     return {
//       title: 'hello world',
//     }
//   },
//   render(h) {
//     return h('div', [
//       h('div', this.msg),
//       h('div', this.title),
//     ])
//   }
// }
// const App = {
//   name: 'App',
//   data(val) {
//     window.vm = this
//     window.VM = this.constructor
//     return {
//       msg: 'hello app'
//     }
//   },
//   components: {
//     HelloWorld,
//   },
//   render(h) {
//     return h('div', [
//       h('HelloWorld', { props: { msg: 'hello app' } }),
//       h('HelloWorld', { props: { msg: 'hello app' } }),
//     ])
//   }
// }
// const v = new Vue({
//   render: h => h(App),
//   // render: h => h('App'),
//   // components: { App },  // 当采用h('App')时，需要注册组件App
// }).$mount('#html')
// window.V = Vue
// window.v = v

  // App
  //   Transition
  //     KeepAlive
  //       HelloWorld
  // v.$parent === undefined // true
  // v.$options.parent === undefined // true
  // vm.$parent === v // true
  // vm.$options.parent === v // true
  // t.$parent === vm // true
  // t.$options.parent === vm // true
  // k.$parent === t // true
  // k.$options.parent === t // true
  // hw2.$parent === vm // true !especial
  // hw2.$options.parent === k // true

// v.$children.length === 1 // true
// v.$children[0] === vm // true
// vm.$children.length === 2 // true
// vm.$children[0] === hw1 // true
  // vm.$children[1] === hw2 // true *
// hw1.$children.length === 0 // true
  // t.$children.length === 0 // true *
  // k.$children.length === 0 // true *
  // hw2.$children.length === 0 // true *

  // v.$root === v // true
  // vm.$root === v // true
  // hw1.$root === v // true
  // t.$root === v // true
  // k.$root === v // true
  // hw2.$root === v // true

  // locate first non-abstract parent
  // 在vm.$options.parent存在且当前组件非抽象组件(options.abstract)时，
  // 将当前实例添加到其最近的非抽象父组件的$children列表中；
  // 处理过程中会跳过抽象父组件(如keep-alive、transition)。
  let parent = options.parent
  // 选项abstract仅在定义组件keep-alive和组件transition才赋值为true
  if (parent && !options.abstract) { // 当前组件存在父组件，且当前组件不为抽象组件(keep-alive/transition)
    while (parent.$options.abstract && parent.$parent) { // 父组件为抽象组件，且父组件存在父组件
      parent = parent.$parent
    }
    // 实例属性$children仅在本文件3处进行了赋值：first
    parent.$children.push(vm)
  }

  // 实例属性$parent仅在此处赋值
  // 实例属性$parent表示最近的非抽象父实例(若无则为undefined)
  vm.$parent = parent
  // 实例属性$root仅在此处赋值，且只在方法formatComponentName中使用了：src/core/util/debug.js
  // 实例属性$root表示根实例(若无父实例则为自身)
  vm.$root = parent ? parent.$root : vm
  // 实例属性$children仅在本文件3处进行了赋值：second
  // 实例属性$children表示子组件数组(初始化为空数组)
  vm.$children = []
  // 实例属性$refs在此处初始化，且仅在方法registerRef里进行操作：
  // 实例属性$refs表示引用对象(初始化为空对象)
  vm.$refs = {}

  // 仅赋值在此处 & 在Watcher构造函数中：src/core/observer/watcher.js
  // 实例属性_watcher用于表示挂载时使用的渲染watcher(侦听器实例)，用于观察数据变化和执行更新，同时也用于在组件销毁时清理和取消侦听操作。
  vm._watcher = null
  // 仅使用被本文件的activateChildComponent方法 & deactivateChildComponent方法
  // 仅使用被queueActivatedComponent方法 & callActivatedHooks方法：src/core/observer/scheduler.js
  // 实例属性_inactive用于表示组件是否处于“非激活”状态，该属性主要与keep-alive的激活/停用机制相关：
  // 当组件被keep-alive缓存且处于停用(deactivated)状态时，_inactive会被设置以反映该状态，以便在需要时能够正确触发activate/deactivate生命周期钩子并控制子树的激活传播。
  vm._inactive = null
  // 仅使用被本文件的activateChildComponent方法 & deactivateChildComponent方法
  // 实例属性_directInactive用于表示组件是否被其“直接”父级置为非激活状态(directly deactivated)。
  // 区别于_inactive：_inactive表示组件当前的整体非激活状态(可能由任意祖先导致)，而_directInactive仅表示该非激活状态是由直接父组件在deactivate过程中直接施加的。
  // 该标志在keep-alive的激活/停用流程(activateChildComponent/deactivateChildComponent)中使用，用以决定是否触发activated/deactivated钩子以及控制停用/激活的递归传播逻辑。
  vm._directInactive = false

  // 仅赋值在本文件的此处 & mountComponent方法中
  // 仅赋值被componentVNodeHooks中的insert钩子中：src/core/vdom/create-component.js
  // 仅赋值被registerComponentHook方法中：src/platforms/weex/runtime/recycle-list/virtual-component.js
  // 实例属性_isMounted用于表示组件是否已完成初次挂载(即mount完成并已执行过mounted钩子)，在mount流程中，组件首次挂载后会将该标志置为true。
  // 用于区分首次挂载与后续更新，避免重复触发某些仅在首次挂载时应执行的逻辑，
  // 并在某些生命周期/激活判断(如keep-alive的activated/deactivated或更新触发条件)中作为判定依据。
  vm._isMounted = false
  // 仅赋值在本文件的此处 & 原型方法Vue.prototype.$destroy中
  // 实例属性_isDestroyed用于表示组件实例是否已销毁，
  // 在组件销毁流程完成时被置为true，用于阻止对已销毁实例的后续操作或重复销毁(例如阻止调度更新、调用生命周期钩子或进行DOM操作)。
  // 框架的其他部分会检查该标志以确定是否应跳过对该实例的进一步处理，保证销毁后的实例不再参与生命周期或渲染流程。
  vm._isDestroyed = false
  // 仅赋值在本文件的此处 & 原型方法Vue.prototype.$destroy中
  // 实例属性_isBeingDestroyed用于表示是否正在销毁中
  // 防止在销毁阶段调用生命周期钩子
  // 阻止不必要的观察者和计算属性更新
  // 通过跳过某些已处于销毁过程中的组件的特定操作来优化清理操作
  // 区分正在销毁的组件和已完全销毁的组件(_isDestroyed)
  vm._isBeingDestroyed = false
}

// 仅调用被主入口文件：src/core/instance/index.js
export function lifecycleMixin (Vue: Class<Component>) {
  // 在组件transition-group中beforeMount钩子函数中重写了此方法：src/platforms/web/runtime/components/transition-group.js
  // 在组件VirtualComponent中重写了此方法：src/platforms/weex/runtime/recycle-list/virtual-component.js

  // 在方法initVirtualComponent中调用了此方法：src/platforms/weex/runtime/recycle-list/virtual-component.js
  // 在本文件的方法mountComponent中调用了此方法
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    const restoreActiveInstance = setActiveInstance(vm)
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    // 实例属性$el仅赋值在本文件的本函数 & mountComponent方法中
    if (!prevVnode) {
      // initial render
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    restoreActiveInstance()
    // update __vue__ reference
    // 属性__vue__仅赋值/使用在本文件的实例方法Vue.prototype._update & 实例方法Vue.prototype.$destroy
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // v.$el.__vue__ === v // true
    // vm.$el.__vue__ === v // true
    // hw1.$el.__vue__ === hw1 // true
    // hw2.$el.__vue__ === t // true
    // k.$el.__vue__ === t // true
    // t.$el.__vue__ === t // true
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }

  // 仅调用被本文件updateChildComponent方法
  // 仅调用被resolveAsyncComponent方法：src/core/vdom/helpers/resolve-async-component.js
  // 仅调用被genDefaultModel方法：src/platforms/web/compiler/directives/model.js
  // 仅调用被transition组件的render选项：src/platforms/web/runtime/components/transition.js
  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this
    if (vm._watcher) {
      vm._watcher.update()
    }
  }

  // 仅调用被pruneCacheEntry方法：src/core/components/keep-alive.js
  // 仅调用被componentVNodeHooks的destroy钩子：src/core/vdom/create-component.js
  // 仅调用被initVirtualComponent方法：src/platforms/weex/runtime/recycle-list/virtual-component.js
  // 仅调用被destroyInstance方法：src/platforms/weex/entry-framework.js
  Vue.prototype.$destroy = function () {
    const vm: Component = this
    if (vm._isBeingDestroyed) {
      return
    }
    callHook(vm, 'beforeDestroy')
    vm._isBeingDestroyed = true
    // remove self from parent
    const parent = vm.$parent
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      // 实例属性$children仅在本文件3处进行了赋值：third
      remove(parent.$children, vm)
    }
    // teardown watchers
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    let i = vm._watchers.length
    while (i--) {
      vm._watchers[i].teardown()
    }
    // remove reference from data ob
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    // call the last hook...
    vm._isDestroyed = true
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null)
    // fire destroyed hook
    callHook(vm, 'destroyed')
    // turn off all instance listeners.
    vm.$off()
    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
}

// 仅调用被实例方法Vue.prototype.$mount：src/platforms/web/runtime/index.js
// 仅调用被实例方法Vue.prototype.$mount：src/platforms/weex/runtime/index.js
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  callHook(vm, 'beforeMount')

  let updateComponent
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)
      const vnode = vm._render()
      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag)

      mark(startTag)
      vm._update(vnode, hydrating)
      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag)
    }
  } else {
    updateComponent = () => {
      vm._update(vm._render(), hydrating)
    }
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  new Watcher(vm, updateComponent, noop, {
    before () {
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}

export let isUpdatingChildComponent: boolean = false
export function updateChildComponent (
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: MountedComponentVNode,
  renderChildren: ?Array<VNode>
) {
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = true
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  const newScopedSlots = parentVnode.data.scopedSlots
  const oldScopedSlots = vm.$scopedSlots
  const hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) ||
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key) ||
    (!newScopedSlots && vm.$scopedSlots.$key)
  )

  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  const needsForceUpdate = !!(
    renderChildren ||               // has new static slots
    vm.$options._renderChildren ||  // has old static slots
    hasDynamicScopedSlot
  )

  vm.$options._parentVnode = parentVnode
  // 实例属性$vnode仅在本文件此处进行赋值
  // 实例属性$vnode仅在initRender方法 & 实例方法Vue.prototype._render中进行赋值：src/core/instance/render.js
  vm.$vnode = parentVnode // update vm's placeholder node without re-render

  if (vm._vnode) { // update child tree's parent
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject
  vm.$listeners = listeners || emptyObject

  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false)
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      const propOptions: any = vm.$options.props // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }

  // update listeners
  listeners = listeners || emptyObject
  const oldListeners = vm.$options._parentListeners
  vm.$options._parentListeners = listeners
  updateComponentListeners(vm, listeners, oldListeners)

  // resolve slots + force update if has children
  if (needsForceUpdate) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    vm.$forceUpdate()
  }

  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false
  }
}

function isInInactiveTree (vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true
  }
  return false
}
export function activateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    callHook(vm, 'activated')
  }
}
export function deactivateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {
    vm._inactive = true
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    callHook(vm, 'deactivated')
  }
}

export function callHook (vm: Component, hook: string) { // 调用生命周期钩子函数
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget()
  const handlers = vm.$options[hook]
  const info = `${hook} hook`
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, null, vm, info)
    }
  }
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
  popTarget()
}
