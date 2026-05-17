// 模板布局定义：从索引 1 开始
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

// 边框样式 -> { 外边距 gap rpx, 内边距 pad rpx }
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
      this._stageLeft = rect.left
      this._stageTop = rect.top
      this.recalcLayout()
    })
  },

  // 查询拼图框在页面中的位置（用于触摸坐标转换）
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

    const style = STYLE_MAP[this.data.leftBorderType] || STYLE_MAP['line-none']
    const gapPx = style.gap * this._rpx2px
    const padPx = style.pad * this._rpx2px

    let frameW
    let frameH
    if (this._stageW / this._stageH > tpl.ratio) {
      frameH = this._stageH
      frameW = frameH * tpl.ratio
    } else {
      frameW = this._stageW
      frameH = frameW / tpl.ratio
    }

    const cells = []
    this.computeCells(tpl.layout, 0, 0, frameW, frameH, gapPx, cells)

    this._gapPx = gapPx
    this._padPx = padPx

    this.setData(
      {
        frameW,
        frameH,
        cells,
        imgPad: padPx,
        currentCount: tpl.count
      },
      () => {
        this.rebuildCellImages()
        this.refreshFrameRect()
      }
    )
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

  // 根据 cells / selectedImages / pad 重建 cellImages
  rebuildCellImages() {
    const cells = this.data.cells
    const selectedImages = this.data.selectedImages
    const imageInfos = this.data.imageInfos
    const pad = this._padPx || 0

    const prev = this.data.cellImages || []
    const cellImages = []
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      let srcIdx
      if (selectedImages.length === 0) {
        srcIdx = -1
      } else if (i < selectedImages.length) {
        srcIdx = i
      } else {
        // 多余 cell 用最后一张图补齐
        srcIdx = selectedImages.length - 1
      }

      const src = srcIdx >= 0 ? selectedImages[srcIdx] : ''
      const info = srcIdx >= 0 ? imageInfos[srcIdx] : null

      // 尝试保留旧 cell 的 offset（如果 src 没变且 cell 大小没变）
      const prevItem = prev[i]
      const fitted = this.fitImageToCell(src, info, cell, pad)
      if (
        prevItem &&
        prevItem.src === fitted.src &&
        prevItem.dispW === fitted.dispW &&
        prevItem.dispH === fitted.dispH
      ) {
        fitted.offsetX = this.clampOffset(prevItem.offsetX, fitted.dispW, cell.w - 2 * pad)
        fitted.offsetY = this.clampOffset(prevItem.offsetY, fitted.dispH, cell.h - 2 * pad)
      }
      cellImages.push(fitted)
    }

    this.setData({ cellImages })
  },

  fitImageToCell(src, info, cell, pad) {
    const cw = Math.max(0, cell.w - 2 * pad)
    const ch = Math.max(0, cell.h - 2 * pad)
    if (!src || !info || cw <= 0 || ch <= 0) {
      return {
        src: src || '',
        naturalW: info ? info.width : 0,
        naturalH: info ? info.height : 0,
        dispW: 0,
        dispH: 0,
        offsetX: 0,
        offsetY: 0
      }
    }
    const nw = info.width || 1
    const nh = info.height || 1
    const ratio = Math.max(cw / nw, ch / nh)
    const dispW = nw * ratio
    const dispH = nh * ratio
    return {
      src,
      naturalW: nw,
      naturalH: nh,
      dispW,
      dispH,
      offsetX: (cw - dispW) / 2,
      offsetY: (ch - dispH) / 2
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
    this.setData(
      {
        leftIndex: idx,
        leftBorderType: list[idx].type,
        leftText: list[idx].text,
        leftLetter: list[idx].letter
      },
      () => this.recalcLayout()
    )
  },

  handleTemplateChange(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({ currentTemplate: index }, () => this.recalcLayout())
  },

  handleSelectImage() {
    const count = this.data.currentCount || 9
    wx.chooseMedia({
      count,
      mediaType: ['image'],
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const paths = res.tempFiles.map(i => i.tempFilePath)
        wx.showLoading({ title: '加载图片...', mask: true })
        Promise.all(
          paths.map(
            src =>
              new Promise(resolve => {
                wx.getImageInfo({
                  src,
                  success: r => resolve({ width: r.width, height: r.height }),
                  fail: () => resolve({ width: 1, height: 1 })
                })
              })
          )
        ).then(infos => {
          wx.hideLoading()
          this.setData(
            {
              selectedImages: paths,
              imageInfos: infos
            },
            () => this.rebuildCellImages()
          )
        })
      }
    })
  },

  // -------- 触摸交互 --------
  onCellTouchStart(e) {
    if (this.data.draggingIdx >= 0) return
    const idx = e.currentTarget.dataset.index
    const t = e.touches[0]
    const img = this.data.cellImages[idx]
    if (!img || !img.src) return

    this._touch = {
      idx,
      startX: t.clientX,
      startY: t.clientY,
      startOffsetX: img.offsetX,
      startOffsetY: img.offsetY,
      mode: 'pending',
      moved: false
    }

    if (this._lpTimer) clearTimeout(this._lpTimer)
    this._lpTimer = setTimeout(() => {
      if (this._touch && this._touch.mode === 'pending' && !this._touch.moved) {
        this._touch.mode = 'drag'
        this.enterDragMode(idx, t.clientX, t.clientY)
        wx.vibrateShort && wx.vibrateShort({ type: 'light' })
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
      if (this._touch.mode === 'pending') {
        clearTimeout(this._lpTimer)
        this._touch.mode = 'pan'
      }
    }
    if (this._touch.mode === 'pan') {
      this.updatePan(dx, dy)
    } else if (this._touch.mode === 'drag') {
      this.updateDragPosition(t.clientX, t.clientY)
    }
  },

  onCellTouchEnd(e) {
    if (this._lpTimer) {
      clearTimeout(this._lpTimer)
      this._lpTimer = null
    }
    if (!this._touch) return
    if (this._touch.mode === 'drag') {
      const t = (e.changedTouches && e.changedTouches[0]) || null
      if (t) {
        this.commitDrag(t.clientX, t.clientY)
      } else {
        this.setData({ draggingIdx: -1 })
      }
    }
    this._touch = null
  },

  updatePan(dx, dy) {
    const idx = this._touch.idx
    const cell = this.data.cells[idx]
    const img = this.data.cellImages[idx]
    if (!cell || !img || !img.src) return
    const pad = this._padPx || 0
    const cw = cell.w - 2 * pad
    const ch = cell.h - 2 * pad
    const nx = this.clampOffset(this._touch.startOffsetX + dx, img.dispW, cw)
    const ny = this.clampOffset(this._touch.startOffsetY + dy, img.dispH, ch)
    const ci = this.data.cellImages.slice()
    ci[idx] = Object.assign({}, ci[idx], { offsetX: nx, offsetY: ny })
    this.setData({ cellImages: ci })
  },

  enterDragMode(idx, pageX, pageY) {
    const cell = this.data.cells[idx]
    this.setData({
      draggingIdx: idx,
      floatW: cell.w,
      floatH: cell.h,
      floatX: pageX - cell.w / 2,
      floatY: pageY - cell.h / 2
    })
  },

  updateDragPosition(pageX, pageY) {
    this.setData({
      floatX: pageX - this.data.floatW / 2,
      floatY: pageY - this.data.floatH / 2
    })
  },

  commitDrag(pageX, pageY) {
    const srcIdx = this.data.draggingIdx
    if (srcIdx < 0) return
    const fl = this._frameLeft || 0
    const ft = this._frameTop || 0
    const localX = pageX - fl
    const localY = pageY - ft
    let targetIdx = -1
    const cells = this.data.cells
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      if (localX >= c.x && localX <= c.x + c.w && localY >= c.y && localY <= c.y + c.h) {
        targetIdx = i
        break
      }
    }
    if (targetIdx >= 0 && targetIdx !== srcIdx) {
      this.swapCellImages(srcIdx, targetIdx)
    }
    this.setData({ draggingIdx: -1 })
  },

  swapCellImages(a, b) {
    const ci = this.data.cellImages.slice()
    const ca = this.data.cells[a]
    const cb = this.data.cells[b]
    const pad = this._padPx || 0
    const oldA = ci[a]
    const oldB = ci[b]
    // 互换图片源，并基于各自 cell 尺寸重新 fit + 居中
    ci[a] = this.fitImageToCell(
      oldB.src,
      oldB.src ? { width: oldB.naturalW, height: oldB.naturalH } : null,
      ca,
      pad
    )
    ci[b] = this.fitImageToCell(
      oldA.src,
      oldA.src ? { width: oldA.naturalW, height: oldA.naturalH } : null,
      cb,
      pad
    )
    this.setData({ cellImages: ci })
  },

  // -------- 保存 --------
  handleSaveImage() {
    if (!this.data.selectedImages.length) {
      wx.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }
    if (!this.data.cells.length || !this.data.frameW) {
      wx.showToast({ title: '布局未就绪', icon: 'none' })
      return
    }

    wx.showLoading({ title: '生成中...', mask: true })

    const query = wx.createSelectorQuery().in(this)
    query.select('#saveCanvas').fields({ node: true, size: true })
    query.exec(res => {
      const item = res[0]
      if (!item || !item.node) {
        wx.hideLoading()
        wx.showToast({ title: '生成失败', icon: 'none' })
        return
      }
      this.drawCanvas(item.node)
    })
  },

  drawCanvas(canvas) {
    const ctx = canvas.getContext('2d')
    const scale = 2
    const W = this.data.frameW
    const H = this.data.frameH
    const pad = this._padPx || 0

    canvas.width = W * scale
    canvas.height = H * scale
    ctx.scale(scale, scale)

    // 整体白底（cell 之间 gap + 有图 cell 的 padding 区域均为白）
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    const cells = this.data.cells
    const cellImages = this.data.cellImages

    const loadImg = src =>
      new Promise((resolve, reject) => {
        const img = canvas.createImage()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
      })

    const drawAll = async () => {
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]
        const img = cellImages[i]
        if (!img || !img.src) {
          ctx.fillStyle = '#000000'
          ctx.fillRect(cell.x, cell.y, cell.w, cell.h)
          continue
        }
        const contentX = cell.x + pad
        const contentY = cell.y + pad
        const contentW = cell.w - 2 * pad
        const contentH = cell.h - 2 * pad
        if (contentW <= 0 || contentH <= 0) continue
        try {
          const imageEl = await loadImg(img.src)
          ctx.save()
          ctx.beginPath()
          ctx.rect(contentX, contentY, contentW, contentH)
          ctx.clip()
          ctx.drawImage(
            imageEl,
            contentX + img.offsetX,
            contentY + img.offsetY,
            img.dispW,
            img.dispH
          )
          ctx.restore()
        } catch (e) {
          // 单图失败不中断
        }
      }

      wx.canvasToTempFilePath({
        canvas,
        success: r => {
          wx.saveImageToPhotosAlbum({
            filePath: r.tempFilePath,
            success: () => {
              wx.hideLoading()
              wx.showToast({ title: '保存成功', icon: 'success', duration: 800 })
              setTimeout(() => {
                const images = encodeURIComponent(JSON.stringify([r.tempFilePath]))
                wx.navigateTo({
                  url: `/pages/result/result?source=puzzle&images=${images}`
                })
              }, 600)
            },
            fail: err => {
              wx.hideLoading()
              const msg = (err && err.errMsg) || ''
              if (msg.indexOf('auth') > -1) {
                wx.showModal({
                  title: '提示',
                  content: '需要授权访问相册才能保存图片',
                  confirmText: '去设置',
                  success: m => {
                    if (m.confirm) wx.openSetting()
                  }
                })
              } else if (msg.indexOf('cancel') === -1) {
                wx.showToast({ title: '保存失败', icon: 'none' })
              }
            }
          })
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({ title: '生成失败', icon: 'none' })
        }
      })
    }

    drawAll()
  }
})
