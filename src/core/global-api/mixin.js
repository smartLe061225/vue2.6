/* @flow */

import { mergeOptions } from '../util/index'

// 仅调用被initGlobalAPI方法：src/core/global-api/index.js
export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
// 测试：
// const mixin = {
//   created() {
//     this.mixinCreated = true
//   },
//   methods: {
//     mixinMethod() {
//       return 'from mixin'
//     }
//   }
// }
// // 全局混入
// Vue.mixin(mixin)
// // 创建组件实例
// const vm = new Vue({
//   created() {
//     this.localCreated = true
//   }
// })
// // 应该包含混入的方法
// vm.mixinCreated // true
// vm.localCreated // true
// vm.mixinMethod() // 'from mixin'
