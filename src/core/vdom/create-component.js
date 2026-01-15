/* @flow */

import VNode from './vnode'
import { resolveConstructorOptions } from 'core/instance/init'
import { queueActivatedComponent } from 'core/observer/scheduler'
import { createFunctionalComponent } from './create-functional-component'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject
} from '../util/index'

import {
  resolveAsyncComponent,
  createAsyncPlaceholder,
  extractPropsFromVNodeData
} from './helpers/index'

import {
  callHook,
  activeInstance,
  updateChildComponent,
  activateChildComponent,
  deactivateChildComponent
} from '../instance/lifecycle'

import {
  isRecyclableComponent,
  renderRecyclableComponentTemplate
} from 'weex/runtime/recycle-list/render-component-template'

// inline hooks to be invoked on component VNodes during patch
const componentVNodeHooks = {
  init (vnode: VNodeWithData, hydrating: boolean): ?boolean {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      const mountedNode: any = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    } else {
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      )
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  },

  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    const options = vnode.componentOptions
    const child = vnode.componentInstance = oldVnode.componentInstance
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  },

  insert (vnode: MountedComponentVNode) {
    const { context, componentInstance } = vnode
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true
      callHook(componentInstance, 'mounted')
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance)
      } else {
        activateChildComponent(componentInstance, true /* direct */)
      }
    }
  },

  destroy (vnode: MountedComponentVNode) {
    const { componentInstance } = vnode
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy()
      } else {
        deactivateChildComponent(componentInstance, true /* direct */)
      }
    }
  }
}
export function createComponentInstanceForVnode (
  // we know it's MountedComponentVNode but flow doesn't
  vnode: any,
  // activeInstance in lifecycle state
  parent: any
): Component {
  const options: InternalComponentOptions = {
    // 内部组件选项属性_isComponent仅在此处进行了赋值操作
    _isComponent: true,
    _parentVnode: vnode,
    parent
  }
  // check inline-template render functions
  const inlineTemplate = vnode.data.inlineTemplate
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render
    options.staticRenderFns = inlineTemplate.staticRenderFns
  }
  return new vnode.componentOptions.Ctor(options)
}

export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | Array<VNode> | void {
  if (isUndef(Ctor)) {
    return
  }

  const baseCtor = context.$options._base

  // plain options object: turn it into a constructor
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor)
  }

  // if at this stage it's not a constructor or an async component factory,
  // reject.
  if (typeof Ctor !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      warn(`Invalid Component definition: ${String(Ctor)}`, context)
    }
    return
  }

  // async component
  let asyncFactory
  if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor)
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }

  data = data || {}

  // resolve constructor options in case global mixins are applied after
  // component constructor creation
  resolveConstructorOptions(Ctor)

  // transform component v-model data into props & events
  if (isDef(data.model)) {
    // 父组件模板中的v-model指令会被渲染函数进行转化：
    // <HelloWorld v-model="msg"/>
    // _c("HelloWorld", {
    //   model: {
    //     value: _vm.msg,
    //     callback: function ($$v) {
    //       _vm.msg = $$v
    //     },
    //     expression: "msg",
    //   },
    // })
    // console.log('---父组件model选项处理之前---', cloneDeep(data))
    // 转化前：
    // {
    //   model: {
    //     callback: ƒ ($$v),
    //     expression: "msg",
    //     value: "hello app",
    //   }
    // }
    transformModel(Ctor.options, data)
    // console.log('---父组件model选项处理之后---', cloneDeep(data), data)
    // 转化后：
    // {
    //   attrs: {
    //     selfProp: "hello app"
    //   },
    //   model: {
    //     callback: ƒ ($$v),
    //     expression: "msg",
    //     value: "hello app",
    //   },
    //   on: {
    //     selfEvent: ƒ ($$v)
    //   }
    // }

    // 特别地：对父组件中以下渲染函数而言：
    // h('Hello-world', {
    //   model: {
    //     value: this.msg,
    //     callback: ($$v) => {
    //       console.log('App model callback', $$v)
    //       this.msg = $$v
    //     },
    //     expression: "msg",
    //   },
    //   on: {
    //     selfEvent(val) {
    //       console.log('App on selfEvent', val)
    //     }
    //   }
    // })
    // 经函数transformModel转化前后的data分别为：
    // 转化前：
    // {
    //   model: {
    //     callback: $$v => {},
    //     expression: 'msg',
    //     value: 'hello app',
    //   },
    //   on: {
    //     selfEvent: ƒ selfEvent(val)
    //   }
    // }
    // 转化后：
    // {
    //   attrs: {
    //     selfProp: 'hello app"
    //   },
    //   model: {
    //     callback: $$v => {},
    //     expression: 'msg',
    //     value: 'hello app'
    //   },
    //   on: {
    //     selfEvent: [
    //       $$v => {},
    //       ƒ selfEvent(val)
    //     ]
    //   },
    // }
  }
  // extract props
  const propsData = extractPropsFromVNodeData(data, Ctor, tag)

  // functional component
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  const listeners = data.on
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  data.on = data.nativeOn

  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything
    // other than props & listeners & slot

    // work around flow
    const slot = data.slot
    data = {}
    if (slot) {
      data.slot = slot
    }
  }

  // install component management hooks onto the placeholder node
  installComponentHooks(data)

  // return a placeholder vnode
  const name = Ctor.options.name || tag
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )

  // Weex specific: invoke recycle-list optimized @render function for
  // extracting cell-slot template.
  // https://github.com/Hanks10100/weex-native-directive/tree/master/component
  /* istanbul ignore if */
  if (__WEEX__ && isRecyclableComponent(vnode)) {
    return renderRecyclableComponentTemplate(vnode)
  }

  return vnode
}
// transform component v-model info (value and callback) into
// prop and event handler respectively.
/**
 * 将父组件v-model的数据转换为prop和event handler
 * 
 * @param {Object} options - 子组件的选项对象，包含model配置
 * @param {string} [options.model.prop='value'] - v-model绑定的prop名称，默认为'value'
 * @param {string} [options.model.event='input'] - v-model触发的事件名称，默认为'input'
 * 
 * @param {VNodeData} data - 父VNode的数据对象，包含model、attrs、on等属性
 * @param {Object} data.model - v-model的信息对象
 * @param {*} data.model.value - v-model绑定的值
 * @param {Function} data.model.callback - v-model的回调函数
 * @param {string} data.model.expression - v-model的表达式
 * 
 * @description
 * - 将data.model.value转换为data.attrs中指定prop的值
 * - 将data.model.callback转换为data.on中指定event的事件监听函数
 * - 若data.on[event]中已存在监听函数，则将新回调和现有监听合并为数组
 * - 实现了v-model的双向绑定机制，将model语法糖转化为props和events
 * // 输入：
 * // <HelloWorld v-model="msg"/>
 * // 转换前: { model: { value: 'hello', callback: fn, expression: 'msg' } }
 * // 转换后: { attrs: { value: 'hello' }, on: { input: fn } }
 */
function transformModel (options, data: any) {
  const prop = (options.model && options.model.prop) || 'value'
  const event = (options.model && options.model.event) || 'input'

  ;(data.attrs || (data.attrs = {}))[prop] = data.model.value
  const on = data.on || (data.on = {})
  const existing = on[event] // data.on[event]上的事件监听回调
  const callback = data.model.callback // data.model.callback上的事件监听回调
  if (isDef(existing)) {
    if (
      Array.isArray(existing)
        ? existing.indexOf(callback) === -1
        : existing !== callback
    ) {
      on[event] = [callback].concat(existing)
    }
  } else {
    on[event] = callback
  }
}
const hooksToMerge = Object.keys(componentVNodeHooks)
/**
 * 用于将预定义钩子函数合并到对应的钩子函数中：
 * 将组件预定义的componentVNodeHooks中的钩子函数合并到传入的data对象的hook属性中。
 * 若data.hook中已存在同名的钩子函数，则会将两个钩子函数合并成一个新函数，以确保在执行时两个钩子都会被依次调用
 * 
 * @param {VNodeData} data - VNode的数据对象，包含hook属性用于存储钩子函数
 * 
 * @description
 * - 遍历hooksToMerge数组中的所有钩子名称（init、prepatch、insert、destroy）
 * - 检查data.hook中是否已存在同名的钩子函数
 * - 若不存在或未被合并过，则直接赋值或通过mergeHook合并两个钩子函数
 * - 使用_merged标记防止同一个钩子函数被多次合并
 * 
 * @example
 */
function installComponentHooks (data: VNodeData) {
  const hooks = data.hook || (data.hook = {})
  for (let i = 0; i < hooksToMerge.length; i++) {
    const key = hooksToMerge[i]
    const existing = hooks[key]
    const toMerge = componentVNodeHooks[key]
    if (existing !== toMerge && !(existing && existing._merged)) {
      // existing不存在 or existing存在且未合并
      // 防止hooks[key]被多次合并
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge
    }
  }
}
/**
 * 用于生成一个依次执行两个钩子函数的新函数，且标记_merged属性为true，用于标识该函数为合并函数，防止重复合并
 * 用途：当组件预定义钩子和用户自定义钩子同时存在时，通过此函数合并两个钩子，确保两个钩子均会被执行
 */
function mergeHook (f1: any, f2: any): Function {
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b)
    f2(a, b)
  }
  merged._merged = true
  return merged
}
window.mergeHook = mergeHook
// function foo() {
//   console.log('foo')
// }
// function bar() {
//   console.log('bar')
// }
// const fn = mergeHook(foo, bar)
// fn() // 'foo' 'bar'
