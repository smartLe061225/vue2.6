import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

initGlobalAPI(Vue)

Object.defineProperty(Vue.prototype, '$isServer', { // $isServer仅在此处使用了
  get: isServerRendering
})

Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext // ssrContext仅在文件：src/server/render.js中赋值了
  }
})
// 为何Vue/VueComponent实例上也会显示这个属性呢
// function Person(name) {
// 	this.name = name
// }
// Person.prototype.sex = 'male'
// Object.defineProperty(Person.prototype, 'age', {
// 	get() {
// 		return 24
// 	}
// })
// let p = new Person('Alex')
// console.log(p)
// // Person {name: 'Alex'}
// // {
// // 	name: "Alex"
// // 	age: （…）
// // 	[[Prototype]]: Object
// // 		sex: "male"
// // 		age: （…）
// // 		constructor: ƒ Person(name)
// // 		get age: ƒ get()
// // 		[[Prototype]]: Object
// // }
// console.log(p.name, p.sex, p.age) // 'Alex' 'male' 24
// console.log(Object.getOwnPropertyNames(p)) // ['name']
// console.log(p.hasOwnProperty('name'), p.hasOwnProperty('male'), p.hasOwnProperty('age')) // true false false
// console.log('name' in p, 'sex' in p, 'age' in p) // true true true
// 控制台中'age'属性显示在了实例p中，可视为一种显示上的bug

// [vm, vm.__proto__, vm.__proto__.__proto__].map(obj => {
// 	return ['$data', '$props', '$isServer', '$ssrContext'].map(key => {
// 		return obj.hasOwnProperty(key)
// 	})
// })
// [
// 	[false, false, false, false]
// 	[false, false, false, false]
// 	[true, true, true, true]
// ]
// 其中vm为非根VueComponent实例

// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

Vue.version = '__VERSION__'

export default Vue
