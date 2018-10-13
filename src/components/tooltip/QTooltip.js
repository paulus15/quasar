import Vue from 'vue'

import ModelToggleMixin from '../../mixins/model-toggle.js'
import PortalMixin from '../../mixins/portal.js'

import { getScrollTarget } from '../../utils/scroll.js'
import { listenOpts } from '../../utils/event.js'
import {
  validatePosition, validateOffset, setPosition, parsePosition
} from '../../utils/position-engine.js'

export default Vue.extend({
  name: 'QTooltip',

  mixins: [ ModelToggleMixin, PortalMixin ],

  props: {
    color: String,
    textColor: String,

    transitionShow: {
      type: String,
      default: 'jump-down'
    },
    transitionHide: {
      type: String,
      default: 'jump-up'
    },

    anchor: {
      type: String,
      default: 'bottom middle',
      validator: validatePosition
    },
    self: {
      type: String,
      default: 'top middle',
      validator: validatePosition
    },
    offset: {
      type: Array,
      default: () => [14, 14],
      validator: validateOffset
    },

    target: {
      type: [Boolean, String],
      default: true
    },

    delay: {
      type: Number,
      default: 0
    }
  },

  data () {
    return {
      transitionState: this.showing
    }
  },

  watch: {
    $route () {
      this.hide()
    },

    showing (val) {
      this.transitionShow !== this.transitionHide && this.$nextTick(() => {
        this.transitionState = val
      })
    },

    target (val) {
      if (this.anchorEl !== void 0) {
        this.__unconfigureAnchorEl()
      }

      this.__pickAnchorEl()
    }
  },

  computed: {
    transition () {
      return 'q-transition--' + (this.transitionState === true ? this.transitionHide : this.transitionShow)
    },

    anchorOrigin () {
      return parsePosition(this.anchor)
    },

    selfOrigin () {
      return parsePosition(this.self)
    },

    classes () {
      return {
        [`bg-${this.color}`]: this.color,
        [`text-${this.color}`]: this.textColor
      }
    }
  },

  methods: {
    __showCondition (evt) {
      // abort with no parent configured or on multi-touch
      if (this.anchorEl === void 0 || (evt !== void 0 && evt.touches !== void 0 && evt.touches.length > 1)) {
        return false
      }
      return true
    },

    __show (evt) {
      clearTimeout(this.timer)

      this.scrollTarget = getScrollTarget(this.anchorEl)
      this.scrollTarget.addEventListener('scroll', this.hide, listenOpts.passive)
      if (this.scrollTarget !== window) {
        window.addEventListener('scroll', this.updatePosition, listenOpts.passive)
      }

      this.__showPortal()

      this.$nextTick(() => {
        this.updatePosition()
      })

      this.timer = setTimeout(() => {
        this.$emit('show', evt)
      }, 600)
    },

    __hide (evt) {
      this.__cleanup()

      this.timer = setTimeout(() => {
        this.__hidePortal()
        this.$emit('hide', evt)
      }, 600)
    },

    __cleanup () {
      clearTimeout(this.timer)

      if (this.scrollTarget) {
        this.scrollTarget.removeEventListener('scroll', this.updatePosition, listenOpts.passive)
        if (this.scrollTarget !== window) {
          window.removeEventListener('scroll', this.updatePosition, listenOpts.passive)
        }
      }
    },

    updatePosition () {
      setPosition({
        el: this.__portal.$el,
        offset: this.offset,
        anchorEl: this.anchorEl,
        anchorOrigin: this.anchorOrigin,
        selfOrigin: this.selfOrigin
      })
    },

    __delayShow (evt) {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.show(evt)
      }, this.delay)
    },

    __delayHide (evt) {
      clearTimeout(this.timer)
      this.hide(evt)
    },

    __unconfigureAnchorEl () {
      if (this.$q.platform.is.mobile) {
        this.anchorEl.removeEventListener('touchstart', this.__delayShow)
        this.anchorEl.removeEventListener('touchmove', this.__delayHide)
        this.anchorEl.removeEventListener('touchend', this.__delayHide)
      }

      this.anchorEl.removeEventListener('mouseenter', this.__delayShow)
      this.anchorEl.removeEventListener('mouseleave', this.__delayHide)
    },

    __configureAnchorEl () {
      if (this.$q.platform.is.mobile) {
        this.anchorEl.addEventListener('touchstart', this.__delayShow)
        this.anchorEl.addEventListener('touchmove', this.__delayHide)
        this.anchorEl.addEventListener('touchend', this.__delayHide)
      }

      this.anchorEl.addEventListener('mouseenter', this.__delayShow)
      this.anchorEl.addEventListener('mouseleave', this.__delayHide)
    },

    __setAnchorEl (el) {
      this.anchorEl = el
      while (this.anchorEl.classList.contains('q-menu--skip')) {
        this.anchorEl = this.anchorEl.parentNode
      }
      this.__configureAnchorEl()
    },

    __pickAnchorEl () {
      if (this.target && typeof this.target === 'string') {
        const el = document.querySelector(this.target)
        if (el !== null) {
          this.__setAnchorEl(el)
        }
        else {
          console.error(`QTooltip: target "${this.target}" not found`, this)
        }
      }
      else if (this.target !== false) {
        this.__setAnchorEl(this.parentEl)
      }
    },

    __render (h) {
      return h('transition', {
        props: { name: this.transition }
      }, [
        this.showing ? h('div', {
          staticClass: 'q-tooltip',
          'class': this.classes
        }, this.$slots.default) : null
      ])
    }
  },

  mounted () {
    this.parentEl = this.$el.parentNode

    this.$nextTick(() => {
      this.__pickAnchorEl()

      if (this.value === true) {
        if (this.anchorEl === void 0) {
          this.$emit('input', false)
        }
        else {
          this.show()
        }
      }
    })
  },

  beforeDestroy () {
    this.__cleanup()

    if (this.anchorEl !== void 0) {
      this.__unconfigureAnchorEl()
    }
  }
})
