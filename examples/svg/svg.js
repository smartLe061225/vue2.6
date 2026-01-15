// The raw data to observe
var stats = [
  { label: 'A', value: 100 },
  { label: 'B', value: 100 },
  { label: 'C', value: 100 },
  { label: 'D', value: 100 },
  { label: 'E', value: 100 },
  { label: 'F', value: 100 },
  { label: 'G', value: 100 },
  { label: 'H', value: 100 }
]

// A reusable polygon graph component
Vue.component('polygraph', {
  props: ['stats'],
  template: '#polygraph-template',
  computed: {
    // a computed property for the polygon's points
    points: function () {
      var total = this.stats.length
      return this.stats.map(function (stat, i) {
        var point = valueToPoint(stat.value, i, total)
        return point.x + ',' + point.y
      }).join(' ')
    }
  },
  components: {
    // a sub component for the labels
    'axis-label': {
      props: {
        stat: Object,
        index: Number,
        total: Number
      },
      template: '#axis-label-template',
      computed: {
        point: function () {
          return valueToPoint(
            +this.stat.value + 10,
            this.index,
            this.total
          )
        }
      }
    }
  }
})

// math helper...
function valueToPoint (value, index, total) {
  var x     = 0
  var y     = -value * 0.8
  var angle = Math.PI * 2 / total * index
  var cos   = Math.cos(angle)
  var sin   = Math.sin(angle)
  var tx    = x * cos - y * sin + 100 // - y * sin + 100，以左上顶点为原点，向右平移100(x轴箭头向右)
  // sin(α - angle)，其中Math.tan(α) = x / y，且α为第一象限内角
  var ty    = x * sin + y * cos + 100 // - y * cos + 100，，以左上顶点为原点，向下平移100(y轴箭头向下)
  return {
    x: tx,
    y: ty
  }
}

// bootstrap the demo
new Vue({
  el: '#demo',
  data: {
    newLabel: '',
    stats: stats
  },
  methods: {
    add: function (e) {
      e.preventDefault()
      if (!this.newLabel) return
      this.stats.push({
        label: this.newLabel,
        value: 100
      })
      this.newLabel = ''
    },
    remove: function (stat) {
      if (this.stats.length > 3) {
        this.stats.splice(this.stats.indexOf(stat), 1)
      } else {
        alert('Can\'t delete more!')
      }
    }
  }
})
