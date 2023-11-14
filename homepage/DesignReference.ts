class DesignReference extends HTMLElement {
  
  static ACTIVATE_KEY = 'Backquote'
  static CHANGE_MODE_KEY = 'Tab'
  static CHANGE_SUB_MODE_KEY = 'Space'
  static ACTIVATE_STICKY_MOUSE_BTN = 4
  static SLIDER_WIDTH = 200
  
  Container: HTMLDivElement
  ImgWrapper: HTMLDivElement
  Img: HTMLImageElement
  ClipPath: SVGClipPathElement
  
  constructor() {
    super()
    const shadowRoot = this.attachShadow({ mode: 'closed' })
    
    shadowRoot.innerHTML = /*html*/`
      <style>
        :host {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          overflow: hidden;
          pointer-events: none;
        }
        
        .DesignReference {
          --DesignReference-opacity: 0.5;
          --DesignReference-wipeX: 0px;
          --DesignReference-wipeY: 0px;
          --DesignReference-wipeAngle: 0deg;
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 999;
        }
        .DesignReference-activateKeyHeld {
          pointer-events: auto;
        }
        .DesignReference-active {}
        .DesignReference-mode-fade {}
        .DesignReference-mode-wipe {}
        
        .DesignReference_ImgWrapper {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          opacity: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .DesignReference-active.DesignReference-mode-fade > .DesignReference_ImgWrapper {
          opacity: var(--DesignReference-opacity);
        }
        .DesignReference-active.DesignReference-mode-wipe > .DesignReference_ImgWrapper {
          opacity: 1;
          clip-path: url(#ClipPath);
        }
        
        .DesignReference_Img {
          display: block;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        .DesignReference_Svg {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          display: block;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        
        .DesignReference_ClipPath {
          transform: rotate(var(--DesignReference-wipeAngle));
          transform-origin: left;
          transform-box: fill-box;
          transition: transform 0.5s;
        }
        
        .DesignReference_ClipPath > rect {
          x: calc(50% + var(--DesignReference-wipeX));
          y: calc(-150vmax + var(--DesignReference-wipeY));
          width: calc(150vmax + 1vmin);
          height: calc(300vmax + 100%);
        }
      </style>
      
      <div class="DesignReference">
        <div class="DesignReference_ImgWrapper">
          <img class="DesignReference_Img" src="./design/desktop-design.jpg" alt="Design Reference"/>
        </div>
        <svg class="DesignReference_Svg">
          <defs>
            <clipPath class="DesignReference_ClipPath" id="ClipPath">
              <rect/>
            </clipPath>
          </defs>
        </svg>
      </div>
    `
    
    this.Container = shadowRoot.querySelector('.DesignReference')!
    this.ImgWrapper = shadowRoot.querySelector('.DesignReference_ImgWrapper')!
    this.Img = shadowRoot.querySelector('.DesignReference_Img')!
    this.ClipPath = shadowRoot.querySelector('.DesignReference_ClipPath')!
  }
  
  static modes = {
    FADE: 'fade',
    WIPE: 'wipe',
  }
  
  activateKeyHeld = false
  active = false
  sticky = false
  mode = DesignReference.modes.FADE
  opacity = 0.5
  initialOpacity = this.opacity
  wipeX = 0
  wipeY = 0
  wipeAngle = 0
  initialX = 0
  initialY = 0
  currentX = 0
  currentY = 0
  mouseIn = false
  screenWidth = 0
  screenHeight = 0
  
  updateMode() {
    this.Container.classList.toggle('DesignReference-mode-fade', this.mode === DesignReference.modes.FADE)
    this.Container.classList.toggle('DesignReference-mode-wipe', this.mode === DesignReference.modes.WIPE)
    
    this.updateImageView()
  }
  
  updateImageView() {
    switch (this.mode) {
      case DesignReference.modes.FADE:
        this.Container.style.setProperty(
          '--DesignReference-opacity',
          `${this.active ? this.opacity : 0}`
        )
        break
      case DesignReference.modes.WIPE:
        this.Container.style.setProperty(
          '--DesignReference-opacity',
          `${this.active ? 1 : 0}`
        )
        this.Container.style.setProperty(
          '--DesignReference-wipeX',
          `${this.wipeX}px`
        )
        this.Container.style.setProperty(
          '--DesignReference-wipeY',
          `${this.wipeY}px`
        )
        this.Container.style.setProperty(
          '--DesignReference-wipeAngle',
          `${this.wipeAngle}deg`
        )
        break
    }
  }
  
  show() {
    this.active = true
    this.Container.classList.add('DesignReference-active')
    this.updateImageView()
    this.dragStart()
    this.updateCursor()
  }
  
  hide() {
    this.Container.classList.remove('DesignReference-active')
    this.active = false
    this.updateImageView()
    this.dragEnd()
    this.updateCursor()
  }
  
  changeMode() {
    const modes = Object.values(DesignReference.modes)
    const currentModeIndex = modes.indexOf(this.mode)
    const nextModeIndex = (currentModeIndex + 1) % modes.length
    this.mode = modes[nextModeIndex]
    this.updateMode()
    this.updateCursor()
  }
  
  changeSubMode() {
    switch (this.mode) {
      case DesignReference.modes.FADE:
        
        return
        
      case DesignReference.modes.WIPE:
        this.wipeAngle += 90
        this.updateCursor(100)
        this.updateImageView()
        return
    }
  }
  
  onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case DesignReference.ACTIVATE_KEY:
        e.preventDefault()
        if (e.repeat) return
        this.sticky = false
        this.activateKeyHeld = true
        this.Container.classList.add('DesignReference-activateKeyHeld')
        this.show()
        return
      case DesignReference.CHANGE_MODE_KEY:
        if (!this.activateKeyHeld) return
        e.preventDefault()
        if (e.repeat) return
        this.changeMode()
        return
      case DesignReference.CHANGE_SUB_MODE_KEY:
        if (!this.activateKeyHeld) return
        e.preventDefault()
        this.changeSubMode()
        return
    }
  }
  
  onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case DesignReference.ACTIVATE_KEY:
        this.Container.classList.remove('DesignReference-activateKeyHeld')
        this.activateKeyHeld = false
        if (!this.sticky) {
          this.hide()
        }
        return
    }
  }
  
  onMouseDown = (e: MouseEvent) => {
    if (this.activateKeyHeld) {
      e.preventDefault()
      if (e.buttons === DesignReference.ACTIVATE_STICKY_MOUSE_BTN) {
        this.sticky = true
      }
    }
  }
  
  onMouseMove = (e: MouseEvent) => {
    this.currentX = e.pageX
    this.currentY = e.pageY
    if (this.activateKeyHeld) {
      this.dragMove()
    }
  }
  
  onMouseEnter = () => {
    this.mouseIn = true
  }
  
  onMouseLeave = () => {
    this.mouseIn = false
  }
  
  onContextMenu = (e: MouseEvent) => {
    if (this.activateKeyHeld) {
      e.preventDefault()
    }
  }
  
  onBlur = () => {
    if (this.activateKeyHeld) {
      this.hide()
    }
  }
  
  dragStart() {
    this.initialX = this.currentX
    this.initialY = this.currentY
    
    this.initialOpacity = this.opacity
    
    this.wipeX = this.currentX - this.screenWidth / 2
    this.wipeY = this.currentY - this.screenHeight / 2
    
    this.updateImageView()
  }
  
  dragMove() {
    const dX = this.currentX - this.initialX
    this.opacity = Math.min(Math.max(this.initialOpacity + dX / DesignReference.SLIDER_WIDTH, 0), 1)
    
    this.wipeX = this.currentX - this.screenWidth / 2
    this.wipeY = this.currentY - this.screenHeight / 2
    this.updateImageView()
  }
  
  dragEnd(){
    
  }
  
  updateCursor(throttle: number = 0) {
    if (!this.active) {
      this.setCursor('', throttle)
      return
    }
    
    switch (this.mode) {
      case DesignReference.modes.FADE:
        this.setCursor('ew-resize', throttle)
        return
        
      case DesignReference.modes.WIPE:
        this.setCursor(this.wipeAngle % 180 >= 90 ? 'row-resize' : 'col-resize', throttle)
        return
    }
  }
  
  stoId = -1
  setCursor(cursor: string, throttle: number = 0) {
    if (throttle === 0) {
      if (this.stoId !== -1) {
        window.clearTimeout(this.stoId)
        this.stoId = -1
      }
      this.forceUpdateCursor(cursor)
    } else {
      if (this.stoId !== -1) return
      this.stoId = window.setTimeout(() => {
        this.stoId = -1
        this.forceUpdateCursor(cursor)
      }, throttle)
    }
  }
  
  rafId1 = -1
  rafId2 = -1
  rafId3 = -1
  forceUpdateCursor(cursor: string) {
    this.Container.style.setProperty('cursor', cursor)
    if (this.rafId1 !== -1 || this.rafId2 !== -1 || this.rafId3 !== -1) return
    this.rafId1 = requestAnimationFrame(() => {
      this.rafId1 = -1
      if (!this.mouseIn) return
      this.Container.requestPointerLock()
      this.rafId2 = requestAnimationFrame(() => {
        this.rafId2 = -1
        this.rafId3 = requestAnimationFrame(() => {
          this.rafId3 = -1
          document.exitPointerLock()
        })
      })
    })
  }
  
  onResize = () => {
    this.screenWidth = window.innerWidth
    this.screenHeight = window.innerHeight
  }
  
  connectedCallback() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    
    document.addEventListener('mousedown', this.onMouseDown)
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mouseenter', this.onMouseEnter)
    document.addEventListener('mouseleave', this.onMouseLeave)
    document.addEventListener('contextmenu', this.onContextMenu)
    
    window.addEventListener('blur', this.onBlur)
    
    window.addEventListener('resize', this.onResize)
    
    this.onResize()
    this.updateMode()
  }
  
  disconnectedCallback() {
    window.removeEventListener('resize', this.onResize)
    
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    
    document.removeEventListener('mousedown', this.onMouseDown)
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseenter', this.onMouseEnter)
    document.removeEventListener('mouseleave', this.onMouseLeave)
    document.removeEventListener('contextmenu', this.onContextMenu)
    
    window.removeEventListener('blur', this.onBlur)
  }
}

window.customElements.define('design-reference', DesignReference)

document.body.appendChild(new DesignReference())
