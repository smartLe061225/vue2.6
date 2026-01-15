/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this
    const SuperId = Super.cid
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }

    const Sub = function VueComponent (options) {
      this._init(options)
    }
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    // 测试1：
    // function Person() {}
    // function Worker() {}
    // Worker.prototype = Object.create(Person.prototype)
    // console.log(Worker instanceof Person) // false
    // console.log(Worker.prototype instanceof Person) // true
    // console.log(Worker.prototype.__proto__ ===  Person.prototype) // true
    // 测试2：
    // Sub instanceof Super // false
    // Sub.prototype instanceof Super // true
    // Sub.prototype.__proto__ ===  Super.prototype // true
    // 测试3：
    // v.hasOwnProperty('constructor') // false
    // V.prototype.hasOwnProperty('constructor') // true
    // V.prototype.constructor === V // true
    // vm.hasOwnProperty('constructor') // false
    // VM.prototype.hasOwnProperty('constructor') // true
    // VM.prototype.constructor === VM // true
    // hw1.hasOwnProperty('constructor') // false
    // HW1.prototype.hasOwnProperty('constructor') // true
    // HW1.prototype.constructor === HW1 // true
    // t.hasOwnProperty('constructor') // false
    // T.prototype.hasOwnProperty('constructor') // true
    // T.prototype.constructor === T // true
    // k.hasOwnProperty('constructor') // false
    // K.prototype.hasOwnProperty('constructor') // true
    // K.prototype.constructor === K // true
    // hw2.hasOwnProperty('constructor') // false
    // HW2.prototype.hasOwnProperty('constructor') // true
    // HW2.prototype.constructor === HW2 // true
    // 每类组件的cid是唯一的，其构造函数也是唯一的
    Sub.cid = cid++
    // V.cid // 0
    // VM.cid // 1
    // HW1.cid // 2
    // T.cid // 4
    // K.cid // 3
    // HW2.cid // 2
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    Sub['super'] = Super
    // V.super === undefined
    // VM.super === V
    // HW1.super === V
    // T.super === V
    // K.super === V
    // HW2.super === V

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps(Sub)
    }
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options
    // V.superOptions === undefined // ttue
    // VM.superOptions === V.options // true
    // HW1.superOptions === V.options // true
    // T.superOptions === V.options // true
    // K.superOptions === V.options // true
    // HW2.superOptions === V.options // true
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    cachedCtors[SuperId] = Sub
    // v.$options._Ctor === undefined // true
    // V.options._Ctor === undefined // true
    // vm.$options._Ctor[0] === VM // true
    // VM.options._Ctor[0] === VM // true
    // hw1.$options._Ctor[0] === HW1 // true
    // HW1.options._Ctor[0] === HW1 // true
    // t.$options._Ctor[0] === T // true
    // T.options._Ctor[0] === T // true
    // k.$options._Ctor[0] === K // true
    // K.options._Ctor[0] === K // true
    // hw2.$options._Ctor[0] === HW2 // true
    // HW2.options._Ctor[0] === HW2 // true
    return Sub
  }
}
// v.$options.name // 'Main'
// V.options.name // undefined
// vm.$options.name // 'App'
// VM.options.name // 'App'
// hw1.$options.name // 'HelloWorld'
// HW1.options.name // 'HelloWorld'
// k.$options.name // 'keep-alive'
// K.options.name // 'keep-alive'
// t.$options.name // 'transition'
// T.options.name // 'transition'
// hw2.$options.name // 'HelloWorld'
// HW2.options.name // 'HelloWorld'
function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}
function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
// 测试：
// const BaseComponent = Vue.extend({
//   data() {
//     return {
//       baseData: 'base'
//     }
//   },
//   methods: {
//     baseMethod() {
//       return 'base method'
//     }
//   },
//   created() {
//     this.baseCreated = true
//   }
// })
// // 验证是 Vue 的子类
// BaseComponent instanceof Vue // false
// BaseComponent.prototype instanceof Vue // true
// BaseComponent.prototype.__proto__ ===  Vue.prototype // true
// BaseComponent.extend === Vue.extend // true
// // 可继续扩展
// const ChildComponent = BaseComponent.extend({
//   data: () => {
//     return {
//       // ...this.$options.data(),
//       childData: 'child'
//     }
//   },
//   methods: {
//     childMethod() {
//       return 'child method'
//     }
//   },
//   created() {
//     this.childCreated = true
//   }
// })
// ChildComponent instanceof Vue // false
// ChildComponent instanceof BaseComponent // false
// ChildComponent.prototype instanceof Vue // true
// ChildComponent.prototype instanceof BaseComponent // true
// ChildComponent.prototype.__proto__ ===  BaseComponent.prototype // true
// BaseComponent.prototype.__proto__ ===  Vue.prototype // true
// ChildComponent.extend === Vue.extend // true
// ChildComponent.extend === BaseComponent.extend // true
// const vm = new ChildComponent()
// vm.baseData // 'base'
// vm.childData // 'child'
// vm.baseMethod() // 'base method'
// vm.childMethod() // 'child method'
// vm.baseCreated // true
// vm.childCreated // true
