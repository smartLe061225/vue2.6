/* @flow */

import { inBrowser } from 'core/util/index'

// check whether current browser encodes a char inside attribute values
{/* <div id="demo">
    <a href="\n"/>
  </div>
  <div id="demo">
    <a href="&#10;"/>
  </div>
  <div id="demo">
    <a href="
"/>
  </div>
</div> */}
let div
function getShouldDecode (href: boolean): boolean {
  div = div || document.createElement('div')
  div.innerHTML = href ? `<a href="\n"/>` : `<div a="\n"/>`
  // div.innerHTML = href ? `<a href="&#10;"/>` : `<div a="&#10;"/>`
//   div.innerHTML = href ? `<a href="
// "/>` : `<div a="
// "/>`
  // console.log(div.innerHTML)
  // console.log(div.innerHTML.indexOf('&#10;'))

  // let demo = document.querySelector("#demo")
  // console.log(demo.innerHTML)
  // console.log(demo.innerHTML.indexOf('&#10;'))
  // console.log(demo.innerHTML.indexOf('\n'))
  return div.innerHTML.indexOf('&#10;') > 0
}
// '\a' === 'a' // true
// '\n' !== 'n' // true
// '\n' === '\u000a' // true
// '\n' === '\x0a' // true

// #3663: IE encodes newlines inside attribute values while other browsers don't
export const shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false
// #6828: chrome encodes content in a[href]
export const shouldDecodeNewlinesForHref = inBrowser ? getShouldDecode(true) : false
