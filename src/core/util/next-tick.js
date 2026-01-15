/* @flow */
/* globals MutationObserver */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'

export let isUsingMicroTask = false

const callbacks = []
let pending = false

function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}
// let arr1 = [1, 3, 5]
// let arr2 = arr1
// arr1.length = 0
// console.error(arr1, arr2) // [] []
// let arr3 = [1, 3, 5]
// let arr4 = arr3.slice()
// arr3.length = 0
// console.error(arr3, arr4) // [] [1, 3, 5]

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
let timerFunc

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    // In problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Technically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  callbacks.push(() => {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  if (!pending) {
    pending = true
    timerFunc()
  }
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
// 将同一时刻的多个任务放在同一微任务队列中/异步任务队列中执行
// // 1.简易版：立即将任务队列添加到微任务中
// let callbacks = [] // 任务队列
// function nextTick(cb) { // 添加任务队列
// 	callbacks.push(cb)
// }
// function run() { // 执行微任务队列
// 	callbacks.forEach(cb => {
// 		cb()
// 	})
// }
// Promise.resolve().then(run) // 立即将任务队列添加到微任务中
// // 测试：必须立刻调用nextTick方法
// nextTick(() => console.log(11)) // 11
// nextTick(() => console.log(22)) // 22
// setTimeout(() => {
// 	nextTick(() => console.log(33)) //
// 	nextTick(() => console.log(44)) //
// }, 3000)

// // 2.改进版：在nextTick函数内将任务队列添加到微任务中
// let callbacks = [] // 任务队列
// function nextTick(cb) { // 添加任务队列
// 	callbacks.push(cb)
// 	p.then(run)
// }
// function run() { // 执行微任务队列
// 	callbacks.forEach(cb => {
// 		cb()
// 	})
// }
// let p = Promise.resolve()
// // 测试：任务队列被多次添加到微任务中
// nextTick(() => console.log(11))
// nextTick(() => console.log(22))
// // 11 22 11 22
// setTimeout(() => {
// 	nextTick(() => console.log(33))
// 	nextTick(() => console.log(44))
// 	// 11 22 33 44 11 22 33 44
// }, 3000)

// // 3.最终版：在nextTick函数内任务队列只被一次添加到微任务中
// let pending = false // 是否已将任务队列添加到微任务中
// let callbacks = [] // 任务队列
// function nextTick(cb) { // 添加任务队列
// 	callbacks.push(cb)
// 	if (!pending) {
// 		pending = true
// 		p.then(run)
// 	}
// }
// function run() { // 执行微任务队列
// 	pending = false
// 	let copys = callbacks.slice()
// 	copys.forEach(cb => {
// 		cb()
// 	})
// 	callbacks.length = 0
// }
// let p = Promise.resolve()
// // 测试：
// nextTick(() => console.log(11))
// nextTick(() => console.log(22))
// // 11 22 11 22
// setTimeout(() => {
// 	nextTick(() => console.log(33)) //
// 	nextTick(() => console.log(44)) //
// 	// 11 22 33 44 11 22 33 44
// }, 3000)

// // 4.扩展版：当cb为空时，返回一个微任务
// let pending = false // 是否已将任务队列添加到微任务中
// let callbacks = [] // 任务队列
// function nextTick(cb, ctx) { // 添加任务队列
// 	let _resolve
// 	if (cb) {
// 		callbacks.push(() => {
// 			cb.apply(ctx)
// 		})
// 	} else {
// 		callbacks.push(() => {
// 			_resolve(ctx)
// 		})
// 	}
// 	if (!pending) {
// 		pending = true
// 		p.then(run)
// 	}

// 	if (!cb) {
// 		return new Promise(resolve => {
// 			_resolve = resolve
// 		})
// 	}
// }
// function run() { // 执行微任务队列
// 	pending = false
// 	let copys = callbacks.slice()
// 	copys.forEach(cb => {
// 		cb()
// 	})
// 	callbacks.length = 0
// }
// let p = Promise.resolve()
// // 测试：
// let p1 = nextTick(() => console.log(11))
// let p2 = nextTick(() => console.log(22))
// let p3 = nextTick(null, { foo: 42 })
// p3.then(res => console.error(res))
// let p4 = nextTick(() => console.log(44))
// let p5 = nextTick(() => console.log(55))
// console.error(p1, p2, p3, p4, p5) // undefined undefined Promise {<pending>} undefined undefined
// // 11 22 44 55 { foo: 42 }
