// 模板布局定义
const TEMPLATES = [
  null,
  { ratio: 4 / 5, layout: { dir: 'v', cells: ['_', '_'] }, count: 2 },
  { ratio: 4 / 5, layout: { dir: 'h', cells: ['_', '_'] }, count: 2 },
  { ratio: 4 / 5, layout: { dir: 'v', cells: ['_', '_', '_'] }, count: 3 },
  {
    ratio: 1,
    layout: {
      dir: 'v',
      cells: [
        { dir: 'h', cells: ['_', '_'] },
        { dir: 'h', cells: ['_', '_'] }
      ]
    },
    count: 4
  },
  {
    ratio: 4 / 5,
    layout: {
      dir: 'v',
      cells: [
        { dir: 'h', cells: ['_', '_'] },
        { dir: 'h', cells: ['_', '_'] },
        { dir: 'h', cells: ['_', '_'] }
      ]
    },
    count: 6
  },
  {
    ratio: 1,
    layout: {
      dir: 'v',
      cells: [
        { dir: 'h', cells: ['_', '_', '_'] },
        { dir: 'h', cells: ['_', '_', '_'] },
        { dir: 'h', cells: ['_', '_', '_'] }
      ]
    },
    count: 9
  },
  { ratio: 5 / 3, layout: { dir: 'h', cells: ['_', '_'] }, count: 2 },
  { ratio: 5 / 3, layout: { dir: 'h', cells: ['_', '_', '_'] }, count: 3 },
  { ratio: 2, layout: { dir: 'h', cells: ['_', '_', '_', '_'] }, count: 4 },
  {
    ratio: 5 / 3,
    layout: {
      dir: 'v',
      cells: [
        { dir: 'h', cells: ['_', '_', '_'] },
        { dir: 'h', cells: ['_', '_', '_'] }
      ]
    },
    count: 6
  },
  { ratio: 4 / 5, layout: { dir: 'v', cells: ['_', '_'] }, count: 2 },
  { ratio: 4 / 5, layout: { dir: 'v', cells: ['_', '_', '_'] }, count: 3 },
  { ratio: 4 / 5, layout: { dir: 'v', cells: ['_', '_', '_', '_'] }, count: 4 },
  { ratio: 5 / 3, layout: { dir: 'h', cells: ['_', '_'] }, count: 2 }
]

// gap=区块间距+整体外留白间距  pad=图片内边距
const STYLE_MAP = {
  'line-none': { gap: 0, pad: 0 },
  'line-small': { gap: 8, pad: 8 },
  'line-medium': { gap: 16, pad: 16 },
  'line-large': { gap: 24, pad: 24 }
}

const LONG_PRESS_MS = 350
const MOVE_THRESHOLD = 6

Page({
  data: {
    selectedImages: [],
    imageInfos: [],
    currentTemplate: 1,
    leftBorderType: 'line-none',
    leftText: '无边框',
    leftLetter: '',
    leftIndex: 0,
    frameW: 0,
    frameH: 0,
    cells: [],
    cellImages: [],
    currentCount: 2,
    imgPad: 0,
    draggingIdx: -1,
    floatX: 0,
    floatY: 0,
    floatW: 0,
    floatH: 0
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this._rpx2px = sysInfo.windowWidth / 750
  },

  onReady() {
    this.queryContainer()
  },

  queryContainer() {
    const query = wx.createSelectorQuery().in(this)
    query.select('.preview-stage').boundingClientRect()
    query.exec(res => {
      const rect = res[0]
      if (!rect || !rect.width) {
        setTimeout(() => this.queryContainer(), 50)
        return
      }
      this._stageW = rect.width
      this._stageH = rect.height
      this.recalcLayout()
    })
  },

  refreshFrameRect() {
    const query = wx.createSelectorQuery().in(this)
    query.select('.puzzle-frame').boundingClientRect()
    query.exec(res => {
      const rect = res[0]
      if (rect) {
        this._frameLeft = rect.left
        this._frameTop = rect.top
      }
    })
  },

  recalcLayout() {
    if (!this._stageW || !this._stageH) return
    const tpl = TEMPLATES[this.data.currentTemplate]
    if (!tpl) return

    const style = STYLE_MAP[this.data.leftBorderType]
    const gapPx = style.gap * this._rpx2px
    const padPx = style.pad * this._rpx2px

    let frameW, frameH
    if (this._stageW / this._stageH > tpl.ratio) {
      frameH = this._stageH
      frameW = frameH * tpl.ratio
    } else {
      frameW = this._stageW
      frameH = frameW / tpl.ratio
    }

    const cells = []
    this.computeCells(tpl.layout, gapPx, gapPx, frameW - gapPx * 2, frameH - gapPx * 2, gapPx, cells)

    this.setData({
      frameW,
      frameH,
      cells,
      imgPad: padPx,
      currentCount: tpl.count
    }, () => {
      this.rebuildCellImages()
      this.refreshFrameRect()
    })
  },

  computeCells(node, x, y, w, h, gap, out) {
    if (!node || !node.cells) {
      out.push({ x, y, w, h, idx: out.length })
      return
    }
    const n = node.cells.length
    if (node.dir === 'h') {
      const cellW = (w - gap * (n - 1)) / n
      for (let i = 0; i < n; i++) {
        const cx = x + i * (cellW + gap)
        this.computeCells(node.cells[i], cx, y, cellW, h, gap, out)
      }
    } else {
      const cellH = (h - gap * (n - 1)) / n
      for (let i = 0; i < n; i++) {
        const cy = y + i * (cellH + gap)
        this.computeCells(node.cells[i], x, cy, w, cellH, gap, out)
      }
    }
  },

  rebuildCellImages() {
    const cells = this.data.cells
    const selectedImages = this.data.selectedImages
    const imageInfos = this.data.imageInfos
    const pad = this.data.imgPad

    const prev = this.data.cellImages || []
    const cellImages = []
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      let srcIdx = i < selectedImages.length ? i : selectedImages.length - 1
      const src = srcIdx >= 0 ? selectedImages[srcIdx] : ''
      const info = srcIdx >= 0 ? imageInfos[srcIdx] : null
      const fitted = this.fitImageToCell(src, info, cell, pad)

      if (prev[i] && prev[i].src === fitted.src) {
        fitted.offsetX = this.clampOffset(prev[i].offsetX, fitted.dispW, cell.w - 2 * pad)
        fitted.offsetY = this.clampOffset(prev[i].offsetY, fitted.dispH, cell.h - 2 * pad)
      }
      cellImages.push(fitted)
    }
    this.setData({ cellImages })
  },

  fitImageToCell(src, info, cell, pad) {
    const cw = Math.max(0, cell.w - 2 * pad)
    const ch = Math.max(0, cell.h - 2 * pad)
    if (!src || !info || cw <= 0 || ch <= 0) {
      return { src: '', naturalW: 0, naturalH: 0, dispW: 0, dispH: 0, offsetX: 0, offsetY: 0 }
    }
    const ratio = Math.max(cw / info.width, ch / info.height)
    return {
      src,
      naturalW: info.width,
      naturalH: info.height,
      dispW: info.width * ratio,
      dispH: info.height * ratio,
      offsetX: (cw - info.width * ratio) / 2,
      offsetY: (ch - info.height * ratio) / 2
    }
  },

  clampOffset(v, dispLen, contentLen) {
    if (dispLen <= contentLen) return (contentLen - dispLen) / 2
    return Math.min(0, Math.max(contentLen - dispLen, v))
  },

  onLeftIconChange() {
    const list = [
      { type: 'line-none', text: '无边框', letter: '' },
      { type: 'line-small', text: '小边框', letter: 'S' },
      { type: 'line-medium', text: '中边框', letter: 'M' },
      { type: 'line-large', text: '大边框', letter: 'L' }
    ]
    const idx = (this.data.leftIndex + 1) % list.length
    this.setData({
      leftIndex: idx,
      leftBorderType: list[idx].type,
      leftText: list[idx].text,
      leftLetter: list[idx].letter
    }, () => this.recalcLayout())
  },

  handleTemplateChange(e) {
    this.setData({ currentTemplate: Number(e.currentTarget.dataset.index) }, () => this.recalcLayout())
  },

  handleSelectImage() {
    const count = this.data.currentCount
    wx.chooseMedia({
      count,
      mediaType: ['image'],
      success: res => {
        const paths = res.tempFiles.map(i => i.tempFilePath)
        wx.showLoading({ title: '加载中' })
        Promise.all(paths.map(src => new Promise(resolve => wx.getImageInfo({ src, success: resolve }))))
          .then(infos => {
            wx.hideLoading()
            this.setData({ selectedImages: paths, imageInfos: infos }, () => this.rebuildCellImages())
          })
      }
    })
  },

  onCellTouchStart(e) {
    const idx = e.currentTarget.dataset.index
    const t = e.touches[0]
    const img = this.data.cellImages[idx]
    if (!img || !img.src) return
    this._touch = { idx, startX: t.clientX, startY: t.clientY, startOX: img.offsetX, startOY: img.offsetY, moved: false }
    this._lpTimer = setTimeout(() => {
      if (!this._touch.moved) {
        this.setData({ draggingIdx: idx, floatX: t.clientX, floatY: t.clientY, floatW: this.data.cells[idx].w, floatH: this.data.cells[idx].h })
      }
    }, LONG_PRESS_MS)
  },

  onCellTouchMove(e) {
    if (!this._touch) return
    const t = e.touches[0]
    const dx = t.clientX - this._touch.startX
    const dy = t.clientY - this._touch.startY
    if (!this._touch.moved && (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD)) {
      this._touch.moved = true
      clearTimeout(this._lpTimer)
    }
    if (this.data.draggingIdx >= 0) {
      this.setData({ floatX: t.clientX, floatY: t.clientY })
    } else if (this._touch.moved) {
      const idx = this._touch.idx
      const cell = this.data.cells[idx]
      const img = this.data.cellImages[idx]
      const pad = this.data.imgPad
      const cw = cell.w - 2 * pad
      const ch = cell.h - 2 * pad
      const nx = this.clampOffset(this._touch.startOX + dx, img.dispW, cw)
      const ny = this.clampOffset(this._touch.startOY + dy, img.dispH, ch)
      const arr = [...this.data.cellImages]
      arr[idx] = { ...arr[idx], offsetX: nx, offsetY: ny }
      this.setData({ cellImages: arr })
    }
  },

  onCellTouchEnd(e) {
    clearTimeout(this._lpTimer)
    if (this.data.draggingIdx >= 0) {
      const t = e.changedTouches[0]
      const fl = this._frameLeft || 0
      const ft = this._frameTop || 0
      const x = t.clientX - fl
      const y = t.clientY - ft
      let target = -1
      this.data.cells.forEach((c, i) => {
        if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) target = i
      })
      if (target >= 0 && target !== this.data.draggingIdx) {
        const arr = [...this.data.cellImages]
        [arr[this.data.draggingIdx], arr[target]] = [arr[target], arr[this.data.draggingIdx]]
        this.setData({ cellImages: arr })
      }
      this.setData({ draggingIdx: -1 })
    }
    this._touch = null
  },

  handleSaveImage() {
    wx.showLoading({ title: '生成图片' })
    const query = wx.createSelectorQuery().in(this)
    query.select('#saveCanvas').fields({ node: true }).exec(res => {
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const scale = 2
      canvas.width = this.data.frameW * scale
      canvas.height = this.data.frameH * scale
      ctx.scale(scale, scale)
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, this.data.frameW, this.data.frameH)
      const pad = this.data.imgPad
      Promise.all(this.data.cellImages.map((item, idx) => {
        if (!item.src) return Promise.resolve(null)
        return new Promise(resolve => {
          const img = canvas.createImage()
          img.src = item.src
          img.onload = resolve.bind(null, { img, cell: this.data.cells[idx], item })
        })
      })).then(list => {
        list.forEach(d => {
          if (!d) return
          const { img, cell, item } = d
          const sx = cell.x + pad + item.offsetX
          const sy = cell.y + pad + item.offsetY
          ctx.drawImage(img, sx, sy, item.dispW, item.dispH)
        })
        wx.canvasToTempFilePath({ canvas, success: r => {
          wx.saveImageToPhotosAlbum({ filePath: r.tempFilePath, success: () => wx.showToast({ title: '保存成功' }) })
          wx.hideLoading()
        } })
      })
    })
  }
})