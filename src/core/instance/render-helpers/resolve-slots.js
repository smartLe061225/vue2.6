/* @flow */

import type VNode from 'core/vdom/vnode'

/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 */
// 仅调用被FunctionalRenderContext方法：src/core/vdom/create-functional-component.js
// 仅调用被initRender方法：src/core/instance/render.js
// 仅调用被updateChildComponent方法：src/core/instance/lifecycle.js
// 仅调用被installRenderHelpers方法：src/core/instance/render-helpers/index.js
// 用于解析组件插槽的核心函数，将组件的子节点按照插槽规则进行分类和处理，返回一个包含所有解析后插槽的对象。
// 参数说明：
// - children: VNode数组，表示组件的子节点数组
// - context: 当前组件实例上下文
// 返回值:
// 一个对象，包含解析后的插槽，键是插槽名称，值是对应的VNode数组
// 关键技术点：
// 5. 属性清理：自动移除slot属性，避免影响后续渲染
// 2. 上下文检查：child.context === context || child.fnContext === context确保插槽在正确的上下文中
// 1. 插槽识别：通过data.slot属性来识别命名插槽
// 3. template标签处理：若子节点是template标签，则将其children添加到插槽中
// 4. 空白过滤：最后会过滤掉只包含空白字符的插槽
// 简化流程：
// 1. 检查children是否存在且非空
// 2. 遍历每个子节点child：
//    a. 若child.data.attrs.slot存在，则删除该属性(清理)
//    b. 若child的上下文匹配当前context且有data.slot：
//       - 按具名插槽处理
//       - 若为template标签，则将其子节点加入插槽
//       - 否则将child本身加入插槽
//    c. 否则：
//       - 按默认插槽处理
// 3. 清理只包含空白节点的插槽
// 4. 返回slots对象
// 测试覆盖率
// - ✅ 基本功能(空值、默认插槽、命名插槽)
// - ✅ 边界情况(template标签、空白节点过滤、属性移除)
// - ✅ 上下文处理(正确上下文、错误上下文、fnContext)
// - ✅ 错误情况(null值、嵌套插槽、重复名称)
export function resolveSlots (
  children: ?Array<VNode>,
  context: ?Component
): { [key: string]: Array<VNode> } {
  // 若无子节点或子节点数组为空，直接返回空对象
  if (!children || !children.length) {
    return {}
  }
  const slots = {}
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i]
    const data = child.data
    // remove slot attribute if the node is resolved as a Vue slot node
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot
    }
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    if ((child.context === context || child.fnContext === context) &&
      data && data.slot != null
    ) {
      // 具名插槽处理
      const name = data.slot
      const slot = (slots[name] || (slots[name] = []))
      if (child.tag === 'template') {
        slot.push.apply(slot, child.children || [])
      } else {
        slot.push(child)
      }
    } else {
      // 默认插槽处理
      (slots.default || (slots.default = [])).push(child)
    }
  }
  // ignore slots that contains only whitespace
  // 空白插槽过滤：清理掉只包含空白字符的插槽
  for (const name in slots) {
    if (slots[name].every(isWhitespace)) {
      delete slots[name]
    }
  }
  return slots
}
function isWhitespace (node: VNode): boolean {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}
global.resolveSlots = resolveSlots
// 关键测试点总结
// 插槽分类正确性：确保不同类型的插槽被正确分类
// 默认插槽：没有slot或上下文不匹配的节点进入默认插槽
// 具名插槽解析：正确分组不同名称的插槽
// 上下文匹配：确保只有相同上下文的节点被识别为具名插槽
// fnContext 支持：functional component的上下文应该被识别
// template处理：template标签的子节点应该被展开
// 属性清理：data.attrs.slot应该被删除
// 空白过滤：只包含空白节点的插槽应该被移除
// 测试1：
// const context = { _uid: 'current' }
// const otherContext = { _uid: 'other' }
// const children = [
//   // 具名插槽header：基础具名插槽
//   {
//     tag: 'div',
//     data: { slot: 'header' },
//     context: context,
//     children: [{ text: 'Header Content' }]
//   },
//   // 具名插槽fnContent：基础具名插槽
//   {
//     tag: 'div',
//     data: { slot: 'fnContent' },
//     fnContext: context, // 使用fnContext，而不是context
//     context: null,
//     children: [{ text: 'Functional Slot' }]
//   },
//   // 具名插槽footer：基础具名插槽
//   {
//     tag: 'div',
//     data: { slot: 'footer' },
//     context: context,
//     children: [{ text: 'footer Content' }]
//   },
//   // 具名插槽footer：template 标签处理
//   {
//     tag: 'template',
//     data: { slot: 'footer' },
//     context: context,
//     children: [
//       { tag: 'h1', children: [{ text: 'Title' }] },
//       { tag: 'p', children: [{ text: 'Subtitle' }] }
//     ]
//   },
//   // 默认插槽
//   {
//     tag: 'p',
//     data: {},
//     context: context,
//     children: [{ text: 'Default Content' }]
//   },
//   // 默认插槽：没有data
//   {
//     tag: 'span',
//     context: context,
//     children: [{ text: 'Default Content' }]
//   },
//   // 上下文不匹配 - 应该进入默认插槽(不同上下文的插槽应被视为默认插槽)
//   {
//     tag: 'span',
//     data: { slot: 'unmatched' },
//     context: otherContext,
//     children: [{ text: 'Unmatched' }]
//   }
// ]
// const slots = resolveSlots(children, context)
// slots.header[0] === children[0] // true
// slots.fnContent[0] === children[1] // true
// slots.footer[0] === children[2] // true
// slots.footer[1] === children[3].children[0] // true
// slots.footer[2] === children[3].children[1] // true
// slots.default[0] === children[4] // true
// slots.default[1] === children[5] // true
// slots.default[2] === children[6] // true

// 测试2：清理data.attrs.slot & 过滤空白节点
// const context = { _uid: 'test-context' }
// const children = [
//   {
//     tag: 'div',
//     data: {
//       slot: 'header',
//       attrs: { slot: 'header', id: 'test' } // 这里也有 slot
//     },
//     context: context
//   },
//   // 空白注释节点
//   {
//     isComment: true,
//     asyncFactory: false,
//     data: { slot: 'empty' },
//     context: context
//   },
//   // 空格文本节点
//   {
//     text: ' ',
//     data: { slot: 'space' },
//     context: context
//   },
//   // 有效内容
//   {
//     text: '',
//     data: { slot: 'none' },
//     context: context
//   },
//   // 有效内容
//   {
//     text: 'Content',
//     data: { slot: 'content' },
//     context: context
//   }
// ]
// const slots = resolveSlots(children, context)
// slots.header[0] === children[0] // true
// children[0].data // {slot: 'header', attrs: {id: 'test'}} // 保留data.slot，去掉data.attrs.slot
// slots.empty // undefined
// slots.space // undefined
// slots.none[0] === children[3] // true
// slots.content[0] === children[4] // true
