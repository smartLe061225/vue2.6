/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

// 仅调用被主入口文件：src/core/index.js
// 用于初始化Vue全局静态API
export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  // 配置对象
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 暴露工具方法（但不建议在应用代码中使用）
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  // 全局 API
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }
  // 测试：
  // const origin = { a: 1 }
  // const obj = { a: 1 }
  // const observableObj = Vue.observable(obj)
  // console.log(obj === observableObj, obj.__ob__.value === obj, observableObj.__ob__.value === observableObj) // true true true
  // // 验证响应性
  // const vm = new Vue({
  //   computed: {
  //     onced() {
  //       return origin.a * 2
  //     },
  //     doubled() {
  //       return obj.a * 2
  //     },
  //     tripled() {
  //       return observableObj.a * 3
  //     }
  //   }
  // })
  // console.log([origin.a, obj.a, observableObj.a], [vm.onced, vm.doubled, vm.tripled]) // [1, 1, 1] [2, 2, 3]
  // // 修改不应触发更新
  // origin.a = 2
  // Vue.nextTick(() => {
  //   console.log([origin.a, obj.a, observableObj.a], [vm.onced, vm.doubled, vm.tripled]) // [2, 1, 1] [2, 2, 3]
  // })
  // setTimeout(() => {
  //   // 修改应触发更新
  //   obj.a = 3
  //   Vue.nextTick(() => {
  //     console.log([origin.a, obj.a, observableObj.a], [vm.onced, vm.doubled, vm.tripled]) // [2, 3, 3] [2 6, 9]
  //   })
  // }, 2000)
  // setTimeout(() => {
  //   // 修改应触发更新
  //   observableObj.a = 4
  //   Vue.nextTick(() => {
  //     console.log([origin.a, obj.a, observableObj.a], [vm.onced, vm.doubled, vm.tripled]) // [2, 4, 4] [2 8 12]
  //   })
  // }, 4000)

  // 初始化 options
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
    // const obj = Object.create(null)
    // obj.__proto__ // undefined
  })
  extend(Vue.options.components, builtInComponents)

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  // 记录基类构造函数
  // 静态属性options._base只在此进行了赋值
  Vue.options._base = Vue
  // v.$options._base === V // true
  // V.options._base === V // true
  // vm.$options._base === V // true
  // VM.options._base === V // true
  // hw1.$options._base === V // true
  // HW1.options._base === V // true
  // t.$options._base === V // true
  // T.options._base === V // true
  // k.$options._base === V // true
  // K.options._base === V // true
  // hw2.$options._base === V // true
  // HW2.options._base === V // true

  initUse(Vue) // 安装插件
  initMixin(Vue) // 全局混入
  initExtend(Vue) // 使用基础 Vue 构造器创建子类
  initAssetRegisters(Vue) // 注册全局组件/指令/过滤器
}
