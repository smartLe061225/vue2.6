/* @flow */
import VNode, { cloneVNode } from './vnode'
import { createElement } from './create-element'
import { resolveInject } from '../instance/inject'
import { normalizeChildren } from '../vdom/helpers/normalize-children'
import { resolveSlots } from '../instance/render-helpers/resolve-slots'
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots'
import { installRenderHelpers } from '../instance/render-helpers/index'

import {
  isDef,
  isTrue,
  hasOwn,
  camelize,
  emptyObject,
  validateProp
} from '../util/index'
import { looseEqual } from '../../shared/util'

// 仅调用被主入口文件：src/core/index.js
// 仅调用被本文件的createFunctionalComponent方法
// 仅调用被installSSRHelpers方法：src/server/optimizing-compiler/runtime-helpers.js
/**
 * 函数式组件的渲染上下文构造函数
 * 为函数式组件创建一个独立的渲染上下文对象,用于确保:
 * 1. createElement 函数能够正确处理命名插槽
 * 2. 提供对组件数据、属性、子节点，父节点的引用和依赖注入的访问(this.injections)
 * 3. 事件监听(this.listeners)
 * 4. 处理作用域插槽和普通插槽的规范化(this.slots, this.$slots, this.$scopedSlots)
 * 5. 一个作用域内的 createElement 函数(_c)，能够正确处理 CSS 模块的作用域 ID
 * 6. 为编译型函数式模板提供必要的运行时支持
 * 
 * @constructor
 * @param {VNodeData} data - 虚拟节点数据对象，包含属性、事件、作用域插槽等
 * @param {Object} props - 组件接收的props对象
 * @param {Array<VNode>} [children] - 组件的子虚拟节点数组
 * @param {Component} parent - 父组件实例，用于上下文和依赖注入查询
 * @param {Class<Component>} Ctor - 组件的构造函数/选项对象
 * 
 * @description
 * 该构造函数初始化以下关键属性:
 * - listeners: 事件监听器(来自data.on)
 * - injections: 解析后的依赖注入值
 * - slots: 动态获取已规范化的插槽
 * - scopedSlots: 动态获取已规范化的作用域插槽
 * - _c: createElement: 工厂函数，处理scoped style和上下文传递
 */
export function FunctionalRenderContext (
  data: VNodeData,
  props: Object,
  children: ?Array<VNode>,
  parent: Component,
  Ctor: Class<Component>
) {
  const options = Ctor.options
  // ensure the createElement function in functional components
  // gets a unique context - this is necessary for correct named slot check
  // 确保 functional components 中的 createElement 函数获得唯一的上下文
  let contextVm
  if (hasOwn(parent, '_uid')) {
    // 若父组件有_uid，则创建一个继承自父组件的新对象
    contextVm = Object.create(parent)
    // 属性_original仅在此处赋值
    // $flow-disable-line
    contextVm._original = parent
  } else {
    // the context vm passed in is a functional context as well.
    // in this case we want to make sure we are able to get a hold to the
    // real context instance.
    // 若传入的上下文已经是functional上下文，则需确保能获取到真实的上下文实例
    contextVm = parent
    // $flow-disable-line
    parent = parent._original
  }
  this.contextVm = contextVm // 自定义
  const isCompiled = isTrue(options._compiled)
  const needNormalization = !isCompiled

  // 设置实例属性
  this.data = data
  this.props = props
  this.children = children
  this.parent = parent
  this.listeners = data.on || emptyObject
  this.injections = resolveInject(options.inject, parent)
  // slots 的懒加载 getter
  this.slots = () => {
    if (!this.$slots) {
      normalizeScopedSlots(
        data.scopedSlots,
        this.$slots = resolveSlots(children, parent)
      )
    }
    return this.$slots
  }
  Object.defineProperty(this, 'scopedSlots', ({
    enumerable: true,
    get () {
      return normalizeScopedSlots(data.scopedSlots, this.slots())
    }
  }: any))

  // support for compiled functional template
  // 支持编译过的functional template
  if (isCompiled) {
    // exposing $options for renderStatic()
    // 为renderStatic()暴露$options
    this.$options = options
    // pre-resolve slots for renderSlot()
    // 为renderSlot()预解析slots
    this.$slots = this.slots()
    this.$scopedSlots = normalizeScopedSlots(data.scopedSlots, this.$slots)
  }

  // 创建_c方法(createElement的别名)
  if (options._scopeId) {
    this._c = (a, b, c, d) => {
      const vnode = createElement(contextVm, a, b, c, d, needNormalization)
      if (vnode && !Array.isArray(vnode)) {
        // 属性fnScopeId仅在Vnode实例对象的构造器函数中赋值：src/core/vdom/vnode.js
        // 属性fnScopeId仅在Vnode原型方法cloneVNode中赋值：src/core/vdom/vnode.js
        // 属性fnScopeId仅在此处赋值
        vnode.fnScopeId = options._scopeId
        // 属性fnScopeId仅在Vnode实例对象的构造器函数中赋值：src/core/vdom/vnode.js
        // 属性fnScopeId仅在Vnode原型方法cloneVNode中赋值：src/core/vdom/vnode.js
        // 属性fnScopeId仅在此处赋值
        // 属性fnScopeId仅在本文件的cloneAndMarkFunctionalResult方法中赋值
        vnode.fnContext = parent
      }
      return vnode
    }
  } else {
    this._c = (a, b, c, d) => createElement(contextVm, a, b, c, d, needNormalization)
  }
}
// npm run serve时，会报错：
// ReferenceError: window is not defined
//     at Object.<anonymous> (/Users/alex/little-stone/vue-source-code/vue2.6/dist/vue.runtime.common.dev.js:3653:1)
installRenderHelpers(FunctionalRenderContext.prototype)
// console.log('render helpers:', Vue.FunctionalRenderContext.prototype)
// 测试：
// const clickHandler = function(a, b) {
// 	console.log('add', a, b)
// 	return a + b
// }
// const data = { on: { click: clickHandler }, scopedSlots: { header: () => {} } }
// const props = { name: 'test' }
// const children = []
// const parent = { _uid: 1 }
// // const originalParent = { _uid: 1 }
// // const parent = { _original: originalParent }
// const Ctor = {
// 	options: {
// 		_compiled: true,
// 		_scopeId: 'scope-123',
// 		inject: {
//       foo: { from: 'foo' },
//       bar: { from: 'bar', default: 'default-bar' }
//     }
// 	}
// }
// const ctx = new FunctionalRenderContext(data, props, children, parent, Ctor)
// // 验证基本属性
// console.log(ctx.data === data) // true
// console.log(ctx.props === props) // true
// console.log(ctx.children === children) // true
// console.log(ctx.parent === parent) // true
// // console.log(vnode.parent === originalParent) // true
// console.log(ctx.listeners === data.on) // true
// console.log(ctx.injections) // {bar: 'default-bar'}
// // 验证slots延迟解析
// // 当Ctor.options._compiled为假时
// // 'should expose $slots when compiled'
// console.log(ctx.$slots === undefined) // true，初始时$slots应该未定义(未调用slots()前)，调用slots()应该解析slots
// console.log(ctx.$scopedSlots === undefined) // true，初始时$scopedSlots为未定义
// console.log(ctx.$options === undefined) // true，初始时$options为未定义
// // 当Ctor.options._compiled为真时
// console.log(ctx.$slots) // {}
// console.log(ctx.scopedSlots === ctx.$scopedSlots) // true
// console.log(ctx.scopedSlots)// {$stable: false, $key: undefined, $hasNormal: false, header: ƒ}
// console.log(ctx.$options === Ctor.options) // true
// // 调用slots方法后应该解析slots
// const slots1 = ctx.slots()
// const slots2 = ctx.slots()
// console.log(slots1 === slots2) // true
// console.log(ctx.$slots === slots2) // true
// // 验证 _c 方法
// const vnode = ctx._c() // 'should provide _c function with scoped style when _scopeId exists'
// console.log(vnode.fnScopeId === Ctor.options._scopeId) // true
// console.log(vnode.fnContext === parent) // true

// 仅调用被createComponent方法：src/core/vdom/create-component.js
// 处理函数式组件的核心函数
// 核心功能
// 创建函数式组件的VNode
// 提供无实例（stateless）的组件渲染
// 性能优化：无响应式数据追踪、无实例生命周期
// 关键特性
// 无状态：没有this上下文
// 无实例：不创建组件实例，节省开销
// props透传：直接接收props作为参数
// 插槽访问：通过context.slots()访问插槽内容
export function createFunctionalComponent (
  Ctor: Class<Component>, // 函数式组件构造函数
  propsData: ?Object,     // props数据
  data: VNodeData,        // VNode数据
  contextVm: Component,   // 上下文组件实例
  children: ?Array<VNode> // 子节点
): VNode | Array<VNode> | void {
  // 1. 获取组件选项
  const options = Ctor.options
  const propOptions = options.props
  const props = {}
  // 2. 处理 props：规范化 props
  if (isDef(propOptions)) {
    // 若组件明确定义了props，则验证并提取
    for (const key in propOptions) {
      props[key] = validateProp(key, propOptions, propsData || emptyObject)
    }
  } else {
    // 若组件未定义props，则合并attrs和props
    if (isDef(data.attrs)) mergeProps(props, data.attrs)
    if (isDef(data.props)) mergeProps(props, data.props)
  }
  // 3. 创建函数式渲染上下文
  const renderContext = new FunctionalRenderContext(
    data,        // 原始VNode数据
    props,       // 处理后的props
    children,    // 子节点
    contextVm,   // 父组件实例
    Ctor         // 组件构造函数
  )
  console.log('renderContext:', renderContext)
  // 4. 执行渲染函数
  const vnode = options.render.call(null, renderContext._c, renderContext)
  // 5. 处理返回结果
  if (vnode instanceof VNode) {
    return cloneAndMarkFunctionalResult(vnode, data, renderContext.parent, options, renderContext)
  } else if (Array.isArray(vnode)) {
    const vnodes = normalizeChildren(vnode) || []
    const res = new Array(vnodes.length)
    for (let i = 0; i < vnodes.length; i++) {
      res[i] = cloneAndMarkFunctionalResult(vnodes[i], data, renderContext.parent, options, renderContext)
    }
    return res
  }
}
setTimeout(() => {
// 测试1：基础函数式组件：应正确创建函数式组件的VNode
// // 1. 定义函数式组件
// const FunctionalButton = {
//   functional: true,
//   render(h, context) {
//     const { props, listeners, slots } = context
//     return h('button', {
//       attrs: {
//         type: props.type || 'button',
//         disabled: props.disabled
//       },
//       on: listeners
//     }, slots().default || 'Click me')
//   }
// }
// // 2. 准备测试数据
// const mockData = {
//   attrs: { id: 'test-btn' },
//   props: { type: 'submit', disabled: false },
//   on: {
//     click:() => console.log('clickHandle')
//   }
// }
// const contextVm = new Vue()
// const children = [createTextVNode('submit button text')]
// // 3. 调用 createFunctionalComponent
// const vnode = createFunctionalComponent(
//   { options: FunctionalButton },
//   mockData.props,
//   mockData,
//   contextVm,
//   children
// )
// // // 4. 断言验证
// console.log(vnode) // 
// console.log(vnode.tag) // 'button')
// console.log(vnode.data) // {attrs: {type: 'submit', disabled: false}, on: {click: ƒ}}
// console.log(vnode.context._original === contextVm) // true
// console.log(vnode.devtoolsMeta) // {renderContext: FunctionalRenderContext}
// console.log(vnode.fnOptions === FunctionalButton) // true
// console.log(vnode.fnContext === contextVm) // true
// console.log(vnode.children === children) // false
// console.log(vnode.children[0] === children[0]) // true

// 测试2：props验证和合并：应正确合并和验证props
const FunctionalComponent = {
  functional: true,
  props: {
    title: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      default: 0
    }
  },
  render(h, { props }) {
    return h('div', `${props.title}: ${props.count}`)
  }
}

// 测试用例 1: 缺少必填 prop
// console.error = jest.fn()

const invalidVNode = createFunctionalComponent(
  { options: FunctionalComponent },
  {}, // 缺少 title
  {},
  new Vue(),
  []
)

// expect(console.error).toHaveBeenCalled()

// 测试用例 2: 正常 props
// const validProps = {
//   title: 'Total',
//   count: 42
// }

// const validVNode = createFunctionalComponent(
//   { options: FunctionalComponent },
//   validProps,
//   {},
//   new Vue(),
//   []
// )

// console.log(validVNode.children[0].text === 'Total: 42')

// 测试用例 3: props 和 attrs 合并
const mergedProps = {
  props: { title: 'Test' },
  attrs: { count: 10, extra: 'value' }
}
console.log( 123, ...FunctionalComponent )
let obj = { foo: 42 }
let res = {...obj, bar: 25}
console.log(res)
console.log({ ...FunctionalComponent, props: {} })
const vnodeWithAttrs = createFunctionalComponent(
  { options: { ...FunctionalComponent, props: {} } }, // 无明确定义 props
  {},
  mergedProps,
  new Vue(),
  []
)

console.log(vnodeWithAttrs.children[0].text === 'Test: 10')


}, 2000)



// 用于处理函数式组件渲染结果的核心函数。其负责克隆VNode并为其添加函数式组件(functional component)的上下文标记，确保正确的组件上下文信息被保留和传递。
// 确保functional components能正确维护自己的上下文和属性
// 1. 输入参数
//   vnode: VNode - 要克隆的原始虚拟节点
//   data: Object - 包含插槽等信息的数据属性
//   contextVm: Component - 函数式组件(functional component)的上下文Vue实例
//   options: Object - 函数式组件(functional component)的选项
//   renderContext: Object - 渲染上下文(仅用于开发环境下的开发工具调试)
// 2. 核心流程
//   1. VNode克隆：克隆原始VNode(避免修改原始节点而造成的引用问题#7817)
//   2. 函数式上下文标记：为克隆的VNode设置函数式组件的上下文信息fnContext(函数式组件的上下文实例)和fnOptions(函数式组件的选项)
//   3. 开发工具支持：开发环境下设置渲染上下文信息devtoolsMeta.renderContext，用于Vue DevTools的调试显示
//   4. 插槽信息处理：若提供了插槽信息(data.slot存在)，将其添加到克隆的VNode中，以确保插槽信息被正确传递
//   5. 返回结果：返回克隆后的VNode
// 3. 为什么要克隆？
//   注释中解释：#7817 clone node before setting fnContext
//   若直接修改原始节点，当节点被重用时（例如来自缓存的普通插槽）/避免重用缓存的普通插槽节点时，fnContext导致错误的具名插槽匹配(不应该匹配的命名插槽被错误匹配)，确保每个functional component有独立的上下文标记
// 4.重要属性
//   fnContext：functional component的上下文实例
//   fnOptions：functional component的选项
//   devtoolsMeta.renderContext：开发工具调试用
//   data.slot：保持插槽名称
// 5.关键技术点
//   VNode克隆策略：采用深度克隆确保原始节点不被修改，避免副作用
//   函数式上下文标识：通过fnContext和fnOptions属性标识函数式组件的结果
//   环境差异化处理：开发环境提供额外的调试信息，生产环境优化性能
//   插槽信息传递：确保插槽信息在克隆过程中被正确保留
//   向后兼容性：处理可能不存在的属性（如data、devtoolsMeta）
function cloneAndMarkFunctionalResult (vnode, data, contextVm, options, renderContext) {
  // #7817 clone node before setting fnContext, otherwise if the node is reused
  // (e.g. it was from a cached normal slot) the fnContext causes named slots
  // that should not be matched to match.
  const clone = cloneVNode(vnode)
  // 属性fnScopeId仅在Vnode实例对象的构造器函数中赋值：src/core/vdom/vnode.js
  // 属性fnScopeId仅在Vnode原型方法cloneVNode中赋值：src/core/vdom/vnode.js
  // 属性fnScopeId仅在本文件的FunctionalRenderContext方法中赋值
  // 属性fnScopeId仅在此处赋值
  clone.fnContext = contextVm
  // 属性fnScopeId仅在Vnode实例对象的构造器函数中赋值：src/core/vdom/vnode.js
  // 属性fnScopeId仅在Vnode原型方法cloneVNode中赋值：src/core/vdom/vnode.js
  // 属性fnScopeId仅在此处赋值
  clone.fnOptions = options
  console.log('process.env.NODE_ENV:', process.env.NODE_ENV)
  if (process.env.NODE_ENV !== 'production') {
    // 开发环境下的元数据
    // 属性devtoolsMeta仅在此处赋值
    (clone.devtoolsMeta = clone.devtoolsMeta || {}).renderContext = renderContext
  }
  if (data.slot) {
    (clone.data || (clone.data = {})).slot = data.slot
  }
  return clone
}
function mergeProps (to, from) {
  for (const key in from) {
    to[camelize(key)] = from[key]
  }
}
// 关键测试点总结
// 克隆正确性：确保返回的是新对象，而不是原引用，确保所有 VNode 属性被正确克隆
// 上下文标记：fnContext和fnOptions正确设置
// 插槽保持：data.slot正确复制
// 开发工具支持：开发环境下设置devtoolsMeta
// 避免污染/副作用：防止缓存节点被错误标记，确保原始节点不被修改
// 边界处理：处理各种边缘情况
// 性能考虑：克隆操作应高效
// 测试1：
// const originalVNodeChildren = [
//   { text: 'Hello', children: [
//     { tag: 'h1', dtaa: {}, text: 'title' },
//     { tag: 'p', dtaa: {}, text: 'content' },
//     { tag: 'div', dtaa: {}, text: 'footer outer', children: [
//       { tag: 'span', dtaa: {}, text: 'footer inner' },
//     ]},
//   ]}
// ]
// const originalVNode = {
//   tag: 'div',
//   data: { attrs: { id: 'test' }, class: 'original', on: { click: () => {} } },
//   children: originalVNodeChildren,
//   devtoolsMeta: { existing: 'data' }, // 已存在的devtoolsMeta不应被修改
// }
// const data = { style: { color: 'red' }, slot: 'header' }
// const contextVm = { _uid: 'func-context', name: 'FunctionalComponent' }
// const options = { name: 'MyFunctionalComp' }
// const renderContext = { props: {}, component: 'Test', slot: 'default' }
// const result = cloneAndMarkFunctionalResult(
//   originalVNode,
//   data,
//   contextVm,
//   options,
//   renderContext
// )
// // 验证克隆结果
// console.log(result !== originalVNode) // true，不是同一个引用
// console.log(result.tag === originalVNode.tag) // true
// console.log(result.data === originalVNode.data) // true
// console.log(originalVNode.data) // { attrs: {id: 'test'}, class: "original", on: {click: ƒ}, slot: "header" }
// // 验证children引用不同(若为深度克隆)
// console.log(result.children === originalVNode.children) // false
// console.log(looseEqual(result.children, originalVNode.children)) // true
// console.log( originalVNode.children === originalVNodeChildren) // true
// // 验证事件处理器引用相同(可能不需要深度克隆函数)
// console.log(result.data.on === originalVNode.data.on) // true
// // 验证上下文标记，应该覆盖原有的fnContext和fnOptions
// console.log(result.fnContext === contextVm) // true
// console.log(result.fnOptions === options) // true
// console.log(result.devtoolsMeta.renderContext === renderContext) // true
// console.log(result.devtoolsMeta.renderContext) // {props: {}, component: 'Test', slot: 'default'}
// // 原始节点不应被修改
// console.log(originalVNode.fnContext === undefined) // true
// console.log(originalVNode.fnOptions === undefined) // true
// console.log(originalVNode.devtoolsMeta) // {existing: 'data'}

// 测试2：避免缓存节点污染(#7817问题)
// // 模拟缓存的插槽节点
// const cachedVNode = {
//   tag: 'span',
//   data: {},
//   children: [{ text: 'Cached Content' }]
// }
// const data1 = { slot: 'first' }
// const data2 = { slot: 'second' }
// const contextVm1 = { _uid: 'context-1' }
// const contextVm2 = { _uid: 'context-2' }
// const options1 = { name: 'MyFunctionalComp-1' }
// const options2 = { name: 'MyFunctionalComp-2' }
// // 第一次使用
// const result1 = cloneAndMarkFunctionalResult(
//   cachedVNode,
//   data1,
//   contextVm1,
//   options1
// )
// // 第二次使用同一缓存节点(模拟重用)
// const result2 = cloneAndMarkFunctionalResult(
//   cachedVNode, // 同一缓存节点
//   data2,
//   contextVm2, // 不同上下文
//   options2
// )
// // 验证两个结果独立
// console.log(result1 !== result2) // true
// console.log(result1.data === cachedVNode.data, cachedVNode.data) // true {slot: 'second'}
// console.log(result2.data === cachedVNode.data, cachedVNode.data) // true {slot: 'second'}
// console.log(result1.fnOptions === options1, options1) // true {name: 'MyFunctionalComp-1'}
// console.log(result2.fnOptions === options2, options2) // true {name: 'MyFunctionalComp-2'}
// console.log(result1.fnContext === contextVm1, contextVm1) // true {_uid: 'context-1'}
// console.log(result2.fnContext === contextVm2, contextVm2) // true {_uid: 'context-2'}
// // 缓存节点不应被修改
// console.log(cachedVNode.fnOptions) // undefined
// console.log(cachedVNode.fnContext) // undefined

// 测试3：处理没有data的VNode
// const originalVNode = {
//   tag: 'div',
//   children: [{ text: 'Text' }]
//   // 没有data属性
// }
// const data = { slot: 'footer' }
// const contextVm = { _uid: 'test-context' }
// const result = cloneAndMarkFunctionalResult(
//   originalVNode,
//   data,
//   contextVm,
//   {}
// )
// // 应该创建data对象并设置slot
// console.log(result.data === data) // true
// console.log(result.data.slot === 'footer') // true
// // 原始VNode不应被修改
// console.log(originalVNode.data) // undefined

// 测试4：合并现有data.slot
// const originalVNode = {
//   tag: 'div',
//   data: { slot: 'original-slot' } // 已有 slot
// }  
// const data = { slot: 'new-slot' }
// const contextVm = { _uid: 'test-context' }
// const result = cloneAndMarkFunctionalResult(
//   originalVNode,
//   data,
//   contextVm,
//   {}
// )
// // 新slot应覆盖原slot
// console.log(result.data === data) // false
// console.log(looseEqual(result.data, data)) // true

// 测试5：Edge Cases：should work with functional component vnode
// const functionalVNode = {
//   tag: 'div',
//   functional: true,
//   fnContext: null
// }
// const data = { }
// const contextVm = { _uid: 'func-ctx' }
// const options = { functional: true }
// const result = cloneAndMarkFunctionalResult(
//   functionalVNode,
//   data,
//   contextVm,
//   options
// )
// console.log(result.fnContext === contextVm) // true
// console.log(result.fnOptions === options) // true
// console.log(result.fnOptions.functional === true) // true

// 测试6：性能考虑：should handle large vnode tree efficiently'
// // 创建深层嵌套的VNode
// const createDeepTree = (depth) => {
//   if (depth === 0) {
//     return { tag: 'span', children: [{ text: 'Leaf' }] }
//   }
//   return {
//     tag: 'div',
//     children: [createDeepTree(depth - 1)]
//   }
// }
// const startTime1 = performance.now()
// const deepVNode = createDeepTree(500)
// const endTime1 = performance.now()
// const startTime2 = performance.now()
// const result = cloneAndMarkFunctionalResult(
//   deepVNode,
//   {},
//   { _uid: 'test' },
//   {}
// )
// const endTime2 = performance.now()
// // 性能检查(可选)
// console.log(startTime1, startTime2) // 3204.2999999523163 3206.1999999284744
// console.log(endTime1, endTime2) // 3206.1999999284744 3206.1999999284744
// console.log(endTime1 - startTime1) // 1.899999976158142
// console.log(endTime2 - startTime2) // 0 应在100ms内完成
