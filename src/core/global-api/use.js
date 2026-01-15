/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    args.unshift(this)
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    installedPlugins.push(plugin)
    return this
  }
}
// 测试1：简单插件
// const MyPlugin1 = {
// 	install: function(Vue, options) {
//     console.log('MyPlugin install this', this) // 'MyPlugin install this' {install: ƒ}
// 		// 1. 添加全局方法或属性
//     Vue.myGlobalMethod = function () {
//       console.log('添加全局方法或属性')
//     }
//     // 2. 添加实例方法
//     Vue.prototype.$myMethod = function (methodOptions) {
//       console.log('添加实例方法')
//     }
//     // 3. 添加全局资源
//     Vue.directive('my-directive', {
//       bind (el, binding, vnode, oldVnode) {
//         console.log('添加全局资源')
//       }
//     })
//     Vue.component('my-component', {
//       props: {
//         title: {
//           default: 'Hello Vue!'
//         }
//       },
//       // template: `<div>{{ title }}</div>`,
//       render(h){
//         return h('div', this.title)
//       }
//     })
//     // 4. 注入组件选项
//     Vue.mixin({
//       created: function () {
//         console.log('注入组件选项')
//       }
//     })
// 	}
// }
// Vue.use(MyPlugin1)
// V.options.directives.__proto__ // undefined ???
// Object.getPrototypeOf(V.options.directives) // {model: {…}, show: {…}, my-directive: {…}}
// Object.getPrototypeOf(V.options.directives).hasOwnProperty // undefined
// Object.getPrototypeOf(V.options.directives).__proto__ // undefined
// let obj = Object.create({foo: 42})
// console.log(obj, obj.foo, obj.__proto__, Object.getPrototypeOf(obj)) // {} 42 {foo: 42} {foo: 42}

// 测试2：应支持带选项的插件
// const options = { someOption: true }
// const plugin = {
//   // 应调用 install 方法
//   install: (_Vue, _options) => console.log('plugin1 has installed!', _Vue === Vue, _options === options) // 'plugin1 has installed!' true true
// }
// // 安装插件
// const res1 = Vue.use(plugin, options)
// console.log(res1 === Vue) // true

// // 测试3：应支持自动安装（插件本身是函数）
// const pluginFunction = (_Vue, _options) => console.log('plugin1 has installed!', _Vue === Vue, _options === options) // 'plugin1 has installed!' true true
// const res2 = Vue.use(pluginFunction, options)
// console.log(res2 === Vue) // true

// // 测试4：应防止重复安装
// const plugin = {
//   install: (_Vue, _options) => console.log('plugin1 has installed!', _Vue === Vue, _options === options), // 'plugin1 has installed!' true true
//   _installed: false
// }
// // 第一次安装
// const res3 = Vue.use(plugin, options)
// // 第二次安装（应跳过）
// const res4 = Vue.use(plugin, options)
// console.log(res3 === Vue) // true
// console.log(res4 === Vue) // true
