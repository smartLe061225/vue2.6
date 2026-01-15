/* not type checking this file because flow doesn't play well with Proxy */

import config from 'core/config'
import { warn, makeMap, isNative } from '../util/index'

let initProxy

if (process.env.NODE_ENV !== 'production') {
  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,BigInt,' +
    'require' // for Webpack/Browserify
  )

  // non-present: 不存在的，不在场的：
  const warnNonPresent = (target, key) => {
    warn(
      `Property or method "${key}" is not defined on the instance but ` +
      'referenced during render. Make sure that this property is reactive, ' +
      'either in the data option, or for class-based components, by ' +
      'initializing the property. ' +
      'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
      target
    )
  }

  const warnReservedPrefix = (target, key) => {
    // Property "el" must be accessed with "$data.el" because 
    warn(
      `Property "${key}" must be accessed with "$data.${key}" because ` +
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
      'prevent conflicts with Vue internals. ' +
      'See: https://vuejs.org/v2/api/#data',
      target
    )
  }

  const hasProxy =
    typeof Proxy !== 'undefined' && isNative(Proxy)

  if (hasProxy) {
    const isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact')
    config.keyCodes = new Proxy(config.keyCodes, {
      set (target, key, value) {
        if (isBuiltInModifier(key)) {
          warn(`Avoid overwriting built-in modifier in config.keyCodes: .${key}`)
          return false
        } else {
          target[key] = value
          return true
        }
      }
    })
    // 测试1：
    // Vue.config.keyCodes.xxx = 12
    // Vue.config.keyCodes.stop = 24 // [Vue warn]: Avoid overwriting built-in modifier in config.keyCodes: .stop
    // Vue.config.keyCodes // Proxy(Object) {xxx: 12}
    // 测试2：
    // Vue.config.keyCodes = { xxx: 12 }
    // Vue.config.keyCodes.stop = 24
    // Vue.config.keyCodes // {xxx: 12, stop: 24}
    // 测试3：
    // Vue.config.keyCodes = {
    //   xxx: 97,
    //   // v: 86, // 按键a/A会触发@keyup.86 & @keyup.v
    //   v: 118, // 按键a/A只会触发@keyup.86
    //   f1: 112,
    //   // camelCase 不可用
    //   mediaPlayPause: 179,
    //   // 取而代之的是 kebab-case 且用双引号括起来
    //   "media-play-pause": 179,
    //   up: [38, 87] // 【&， w】 仅按键w/W会触发
    // }
    // <!-- error  'v-on' directives don't support the modifier 'xxx'  vue/valid-v-on -->
    // <!-- <input type="text" @keyup.xxx="keyupHandle($event, 'xxx')" /><br/> -->
    // <input type="text" @keyup.a="keyupHandle($event, 'a')" /><br/>
    // <input type="text" @keyup.97="keyupHandle($event, 97)" /><br/>
    // <input type="text" @keyup.A="keyupHandle($event, 'A')" /><br/>
    // <input type="text" @keyup.65="keyupHandle($event, 65)" /><br/>
    // <input type="text" @keyup.v="keyupHandle($event, 'v')" /><br/>
    // <input type="text" @keyup.118="keyupHandle($event, 118)" /><br/>
    // <input type="text" @keyup.V="keyupHandle($event, 'V')" /><br/>
    // <input type="text" @keyup.86="keyupHandle($event, 86)" /><br/>
    // <input type="text" @keyup.f1="keyupHandle($event, 'f1')" /><br/>
    // <input type="text" @keyup.112="keyupHandle($event, 112)" /><br/>
    // <input type="text" @keyup.media-play-pause="keyupHandle($event, 'media-play-pause')" /><br/>
    // <input type="text" @keyup.up="keyupHandle($event, 'up')" /><br/>
    // <input type="text" @keyup.&="keyupHandle($event, '&')" /><br/>
    // <!-- 结论：无论caps lock键是否选中，按键a/A对应的按键码均为65，因此按键a/A均会触发@keyup.a/@keyup.65 -->
    // {
    //   ...
    //   methods: {
    //     keyupHandle(evt, val) {
    //       console.log(evt.keyCode, val)
    //     }
    //   },
    //   。。。
    // }
  }

  const hasHandler = {
    has (target, key) {
      const has = key in target
      const isAllowed = allowedGlobals(key) ||
        (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data))
      if (!has && !isAllowed) {
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }
      return has || !isAllowed
    }
  }

  const getHandler = {
    get (target, key) {
      if (typeof key === 'string' && !(key in target)) {
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }
      return target[key]
    }
  }

  initProxy = function initProxy (vm) {
    if (hasProxy) {
      // determine which proxy handler to use
      const options = vm.$options
      const handlers = options.render && options.render._withStripped
        ? getHandler
        : hasHandler
      vm._renderProxy = new Proxy(vm, handlers)
    } else {
      vm._renderProxy = vm
    }
  }
}

export { initProxy }
