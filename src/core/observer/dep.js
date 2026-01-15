/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
// 在响应式数据处理时会递归调用此方法：src/core/observer/index.js
// 仅调用被构造函数Observer & defineReactive方法
// 结论：一个结点一个Dep实例对象
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  // 仅调用被Watcher实例对象的addDep方法
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  // 仅调用被Watcher实例对象的teardown方法 & cleanupDeps方法
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 仅调用被Watcher实例对象的depend方法 & defineReactive方法中get访问器
  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  // 仅调用被defineReactive方法中set访问器：src/core/observer/array.js
  // 仅调用被Vue实例方法vm.$set & 静态方法Vue.set：src/core/observer/array.js
  // 仅调用被Vue实例方法vm.$delete & 静态方法Vue.delete：src/core/observer/array.js
  // 仅调用被操作数组的7个原型方法：src/core/observer/array.js
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 仅使用被Watcher实例对象的depend方法
// 仅使用被createComputedGetter方法：src/core/instance/state.js
// 仅使用被defineReactive方法中get访问器：src/core/observer/array.js
Dep.target = null
const targetStack = []

// 仅被Watcher实例对象的get方法调用时传入了参数target，其它地方均未传入
export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
