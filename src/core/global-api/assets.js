/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id
          definition = this.options._base.extend(definition) // definition = Vue.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
// 测试1：自定义组件
// const MyComponent = {
//   template: '<div>My Component</div>'
// }
// // 注册组件
// const returnedVue = Vue.component('my-component', MyComponent)
// // 应可以在组件中使用
// const vm1 = new Vue({
//   template: '<my-component />',
//   components: {
//     'my-component': MyComponent
//   }
// }).$mount()
// console.log(vm1.$el) // <div>​My Component​</div>​

// 测试2：自定义指令
// const myDirective = {
//   bind(el, binding) {
//     el.textContent = binding.value
//   }
// }
// // 注册指令
// Vue.directive('my-directive', myDirective)
// // 应注册到全局 directives
// console.log(Vue.options.directives['my-directive'] === myDirective) // true
// // 应可以在组件中使用
// const vm2 = new Vue({
//   template: '<div v-my-directive="message"></div>',
//   data: {
//     message: 'Hello Directive'
//   }
// }).$mount()
// console.log(vm2.$el) // <div>​Hello Directive​</div>​

// 测试3：自定义过滤器
// const reverseFilter = (value) => {
//   return value.split('').reverse().join('')
// }
// // 注册过滤器
// Vue.filter('reverse', reverseFilter)
// // 应该注册到全局 filters
// console.log(Vue.options.filters.reverse === reverseFilter) // true
// // 应该可以在模板中使用
// const vm3 = new Vue({
//   template: '<div>{{ message | reverse }}</div>',
//   data: {
//     message: 'abc'
//   }
// }).$mount()
// console.log(vm3.$el) // <div>​cba​</div>​
