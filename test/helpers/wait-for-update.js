import Vue from 'vue'

// helper for async assertions.
// Use like this:
//
// vm.a = 123
// waitForUpdate(() => {
//   expect(vm.$el.textContent).toBe('123')
//   vm.a = 234
// })
// .then(() => {
//   // more assertions...
// })
// .then(done)
window.waitForUpdate = initialCb => {
  let end
  const queue = initialCb ? [initialCb] : []

  function shift () {
    const job = queue.shift()
    if (queue.length) {
      let hasError = false
      try {
        // job(shift): setTimeout(shift, wait)
        job.wait ? job(shift) : job()
      } catch (e) {
        // 边界情况2：
        hasError = true
        const done = queue[queue.length - 1]
        if (done && done.fail) {
          done.fail(e)
        }
      }
      if (!hasError && !job.wait) {
        if (queue.length) {
          Vue.nextTick(shift)
        }
      }
    } else if (job && (job.fail || job === end)) {
      job() // done
    }
  }

  Vue.nextTick(() => {
    // 边界情况1：
    if (!queue.length || (!end && !queue[queue.length - 1].fail)) {
      throw new Error('waitForUpdate chain is missing .then(done)')
    }
    shift()
  })

  const chainer = {
    then: nextCb => {
      queue.push(nextCb)
      return chainer
    },
    thenWaitFor: (wait) => {
      if (typeof wait === 'number') {
        wait = timeout(wait)
      }
      wait.wait = true
      queue.push(wait)
      return chainer
    },
    end: endFn => {
      queue.push(endFn)
      end = endFn
    }
  }

  return chainer
}

function timeout (n) {
  return next => setTimeout(next, n)
}
// function delayFn() {
// 	console.log('a few sendos later...')
// }

// function timeout(wait) {
// 	return next => setTimeout(next, wait)
// }
// timeout(5000)(delayFn)

// function timeout(wait) {
// 	return new Promise(resolve => {
// 		setTimeout(() => resolve(), wait)
// 	})
// }
// timeout(5000).then(delayFn)

// function timeout(wait, fn) {
// 	return new Promise(resolve => {
// 		setTimeout(() => resolve(), wait)
// 	}).then(() => fn())
// }
// timeout(5000, delayFn)

// 测试代码：
// let vm = new Vue({
// 	data: {
// 		msg: 'foo'
// 	},
// 	render(h) {
// 		return h('div', this.msg)
// 	}
// }).$mount()
// console.log(vm.msg, vm.$el.textContent) // 'foo' 'foo'

// vm.msg = 'bar'
// console.log(vm.msg, vm.$el.textContent) // 'bar' 'foo'
// vm.$nextTick(() => {
// 	console.log(vm.msg, vm.$el.textContent) // 'bar' 'bar'
// })

// vm.msg = 'baz'
// console.log(vm.msg, vm.$el.textContent) // 'baz' 'bar'
// waitForUpdate(() => {
// 	console.log(vm.msg, vm.$el.textContent) // 'baz' 'baz'
// 	vm.msg = 'qux'
// 	console.log(vm.msg, vm.$el.textContent) // 'qux' 'baz'
// }).then(() => {
// 	console.log(vm.msg, vm.$el.textContent) // 'qux' 'qux'
// 	vm.msg = 'quux'
// 	console.log(vm.msg, vm.$el.textContent) // 'quux' 'qux'
// }).thenWaitFor(3000).then(() => {
// 	console.log(vm.msg, vm.$el.textContent) // 'quux' 'quux'
// 	vm.msg = 'corge'
// 	console.log(vm.msg, vm.$el.textContent) // 'corge' 'quux'
// }).end(() => {
// 	console.log(vm.msg, vm.$el.textContent) // 'corge' 'corge'
// })

// 边界情况1：
// waitForUpdate() // vue.runtime.esm.js:2202 Error: waitForUpdate chain is missing .then(done)

// function fn1() {
// 	console.log('fn1')
// }
// waitForUpdate(() => { // Error: waitForUpdate chain is missing .then(done)
// 	console.log('then')
// }).then(fn1)

// function fn2() {
// 	console.log('fn2') // 'fn2'
// }
// fn2.fail = 'failed'
// waitForUpdate(() => {
// 	console.log('then') // 'then'
// }).then(fn2)

// function fn3() {
// 	console.log('fn3') // 'fn3'
// }
// waitForUpdate(() => {
// 	console.log('then') // 'then'
// }).end(fn3)

// 边界情况2：
// function fn3() {
// 	console.log('fn3') //
// }
// waitForUpdate(() => {
// 	console.log('then') // 'then'
// 	throw new Error('bad things happened') // 错误不会处理
// }).end(fn3)

// function fn4() {
// 	console.log('fn4') //
// }
// fn4.fail = function(err) {
// 	console.log('fn4.fail: ', err) // 'fn4.fail':  Error: bad things happened
// }
// waitForUpdate(() => {
// 	console.log('then') // 'then'
// 	throw new Error('bad things happened') // 错误会处理
// }).then(fn4)
// waitForUpdate(() => {
// 	console.log('then') // 'then'
// 	throw new Error('bad things happened') // 错误会处理
// }).end(fn4)
