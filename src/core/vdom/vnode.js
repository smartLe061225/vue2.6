/* @flow */
/**
 * VNode 虚拟节点类
 * 用于表示Vue应用中的虚拟DOM节点，包含节点的标签、数据、子节点等信息
 * 
 * @class VNode
 * @property {string|void} tag - 节点标签名
 * @property {VNodeData|void} data - 节点数据对象，包含属性、事件、样式等
 * @property {Array<VNode>|void} children - 子节点数组
 * @property {string|void} text - 文本内容
 * @property {Node|void} elm - 对应的真实DOM节点
 * @property {string|void} ns - 命名空间
 * @property {Component|void} context - 节点所在的组件实例作用域
 * @property {string|number|void} key - 节点唯一标识键
 * @property {VNodeComponentOptions|void} componentOptions - 组件配置选项
 * @property {Component|void} componentInstance - 组件实例引用，用于存储该VNode对应的组件实例。主要用于访问组件实例的属性和方法，实现组件间通信和生命周期管理
 * @property {VNode|void} parent - 父节点（组件占位符节点）
 * @property {boolean} raw - 是否包含原始HTML（仅服务端）
 * @property {boolean} isStatic - 是否为提升的静态节点
 * @property {boolean} isRootInsert - 是否需要进行根节点插入检查
 * @property {boolean} isComment - 是否为空注释占位符
 * @property {boolean} isCloned - 是否为克隆节点
 * @property {boolean} isOnce - 是否为v-once节点
 * @property {Function|void} asyncFactory - 异步组件工厂函数
 * @property {Object|void} asyncMeta - 异步组件元数据
 * @property {boolean} isAsyncPlaceholder - 是否为异步占位符
 * @property {Object|void} ssrContext - 服务端渲染上下文
 * @property {Component|void} fnContext - 函数式组件的真实上下文vm
 * @property {ComponentOptions|void} fnOptions - 函数式组件选项（用于SSR缓存）
 * @property {Object|void} devtoolsMeta - 用于存储函数式组件的渲染上下文供devtools使用
 * @property {string|void} fnScopeId - 函数式组件作用域ID支持
 */
export default class VNode {
  tag: string | void;
  data: VNodeData | void;
  children: ?Array<VNode>;
  text: string | void;
  elm: Node | void;
  ns: string | void;
  context: Component | void; // rendered in this component's scope
  key: string | number | void;
  componentOptions: VNodeComponentOptions | void;
  componentInstance: Component | void; // component instance
  parent: VNode | void; // component placeholder node

  // strictly internal
  raw: boolean; // contains raw HTML? (server only)
  isStatic: boolean; // hoisted static node
  isRootInsert: boolean; // necessary for enter transition check
  isComment: boolean; // empty comment placeholder?
  isCloned: boolean; // is a cloned node?
  isOnce: boolean; // is a v-once node?
  asyncFactory: Function | void; // async component factory function
  asyncMeta: Object | void;
  isAsyncPlaceholder: boolean;

  ssrContext: Object | void;
  fnContext: Component | void; // real context vm for functional nodes
  fnOptions: ?ComponentOptions; // for SSR caching
  devtoolsMeta: ?Object; // used to store functional render context for devtools
  fnScopeId: ?string; // functional scope id support

  constructor (
    tag?: string,
    data?: VNodeData,
    children?: ?Array<VNode>,
    text?: string,
    elm?: Node,

    context?: Component,
    componentOptions?: VNodeComponentOptions,
    asyncFactory?: Function
  ) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = undefined
    this.context = context
    this.key = data && data.key
    this.componentOptions = componentOptions
    // 属性componentInstance仅在本文件此处赋值(初始化)
    // 属性componentInstance仅在componentInstance函数中赋值：src/core/vdom/patch.js
    // 属性componentInstance仅在componentVNodeHooks的init/prepatch钩子中赋值：src/core/vdom/create-component.js
    // 属性componentInstance仅在keep-alive组件的render选项中赋值：src/core/components/keep-alive.js
    this.componentInstance = undefined // no cloned
    this.parent = undefined // no cloned

    this.raw = false // no cloned
    this.isStatic = false
    this.isRootInsert = true // no cloned
    this.isComment = false
    this.isCloned = false
    this.isOnce = false // no cloned
    this.asyncFactory = asyncFactory
    this.asyncMeta = undefined
    this.isAsyncPlaceholder = false // no cloned

    // 属性fnContext仅在此处赋值
    // 属性fnContext仅在本文件的cloneVNode方法中赋值
    // 属性fnContext仅在FunctionalRenderContext方法中赋值：src/core/vdom/create-functional-component.js
    // 属性fnContext仅在cloneAndMarkFunctionalResult方法中赋值：src/core/vdom/create-functional-component.js
    this.fnContext = undefined
    // 属性fnContext仅在此处赋值
    // 属性fnOptions仅在本文件的cloneVNode方法中赋值
    // 属性fnOptions仅在cloneAndMarkFunctionalResult方法中赋值：src/core/vdom/create-functional-component.js
    this.fnOptions = undefined
    // 属性fnScopeId仅在此处赋值
    // 属性fnScopeId仅在本文件的cloneVNode方法中赋值
    // 属性fnScopeId仅在FunctionalRenderContext方法中赋值：src/core/vdom/create-functional-component.js
    this.fnScopeId = undefined
    ;(global.vnodeList || (global.vnodeList = [])).push(this)
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child (): Component | void {
    console.log('get child: ', this.componentInstance)
    return this.componentInstance
  }
}
// vnodeList.map(vnode => {
// 	let res = {}
// 	Object.keys(vnode).forEach(key => {
// 		if (key === 'tag' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'data' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'children' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'text' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'elm' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'ns' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'context' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'key' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'componentOptions' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'componentInstance' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'parent' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'raw' && vnode[key] !== false) res[key] = vnode[key]
// 		if (key === 'isStatic') res[key] = vnode[key]
// 		// if (key === 'isRootInsert' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'isComment' && vnode[key] !== false) res[key] = vnode[key]
// 		if (key === 'isCloned' && vnode[key] !== false) res[key] = vnode[key]
// 		if (key === 'isOnce' && vnode[key] !== false) res[key] = vnode[key]
// 		if (key === 'asyncFactory' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'asyncMeta' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'isAsyncPlaceholder' && vnode[key] !== false) res[key] = vnode[key]
// 		if (key === 'fnContext' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'fnOptions' && vnode[key] !== undefined) res[key] = vnode[key]
// 		if (key === 'fnScopeId' && vnode[key] !== undefined) res[key] = vnode[key]
// 	})
// 	console.log(res, res.elm)
// 	return res
// })

export const createEmptyVNode = (text: string = '') => {
  const node = new VNode()
  node.text = text
  node.isComment = true
  return node
}

export function createTextVNode (val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val))
  // 上面一行代码等价于：
  // const node = new VNode()
  // node.text = val
  // return node
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
// 仅调用被createElm方法：src/core/vdom/patch.js
// 仅调用被cloneAndMarkFunctionalResult方法：src/core/vdom/create-functional-component.js
export function cloneVNode (vnode: VNode): VNode {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    // #7975
    // clone children array to avoid mutating original in case of cloning
    // a child.
    // 拷贝子数组以避免在克隆子项时修改原始数组。
    vnode.children && vnode.children.slice(),
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  )
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isComment = vnode.isComment

  // 属性fnContext仅在本文件的Vnode实例对象的构造器函数中赋值
  // 属性fnContext仅在此处赋值
  // 属性fnContext仅在FunctionalRenderContext方法中赋值：src/core/vdom/create-functional-component.js
  // 属性fnContext仅在cloneAndMarkFunctionalResult方法中赋值：src/core/vdom/create-functional-component.js
  cloned.fnContext = vnode.fnContext
  // 属性fnOptions仅在本文件的Vnode实例对象的构造器函数中赋值
  // 属性fnOptions仅在此处赋值
  // 属性fnOptions仅在cloneAndMarkFunctionalResult方法中赋值：src/core/vdom/create-functional-component.js
  cloned.fnOptions = vnode.fnOptions
  // 属性fnScopeId仅在本文件的Vnode实例对象的构造器函数中赋值
  // 属性fnScopeId仅在此处赋值
  // 属性fnScopeId仅在FunctionalRenderContext方法中赋值：src/core/vdom/create-functional-component.js
  cloned.fnScopeId = vnode.fnScopeId
  cloned.asyncMeta = vnode.asyncMeta
  cloned.isCloned = true
  return cloned
}
