// 模板布局定义：从索引 1 开始
// ratio: 整体宽高比；layout: 嵌套结构（dir='h' 水平排列 / dir='v' 垂直排列）；count: 区块数量
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

// 边框间距（单位 rpx）
const GAP_MAP = {
  'line-none': 0,
  'line-small': 8,
  'line-medium': 16,
  'line-large': 24
}

Page({
  data: {
    selectedImages: [],
    currentTemplate: 1,
    leftBorderType: 'line-none',
    leftText: '无边框',
    leftLetter: '',
    leftIndex: 0,
    frameW: 0,
    frameH: 0,
    cells: [],
    currentCount: 2
  },

  onReady() {
    this.queryContainer()
  },

  queryContainer() {
    const query = wx.createSelectorQuery().in(this)
    query.select('.preview-black-bg').boundingClientRect()
    query.exec(res => {
      const rect = res[0]
      if (!rect || !rect.width) {
        setTimeout(() => this.queryContainer(), 50)
        return
      }
      this._blackW = rect.width
      this._blackH = rect.height
      const sysInfo = wx.getSystemInfoSync()
      this._rpx2px = sysInfo.windowWidth / 750
      this.recalcLayout()
    })
  },

  recalcLayout() {
    if (!this._blackW || !this._blackH) return
    const tpl = TEMPLATES[this.data.currentTemplate]
    if (!tpl) return

    const gapPx = GAP_MAP[this.data.leftBorderType] * this._rpx2px
    // 黑色容器内留一点 padding，避免拼图框贴边
    const innerPad = 16 * this._rpx2px
    const usableW = this._blackW - innerPad * 2
    const usableH = this._blackH - innerPad * 2

    let frameW
    let frameH
    if (usableW / usableH > tpl.ratio) {
      frameH = usableH
      frameW = frameH * tpl.ratio
    } else {
      frameW = usableW
      frameH = frameW / tpl.ratio
    }

    const cells = []
    this.computeCells(tpl.layout, 0, 0, frameW, frameH, gapPx, cells)

    this.setData({
      frameW,
      frameH,
      cells,
      currentCount: tpl.count
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
        this.setData({ selectedImages: paths })
      }
    })
  },

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
    const scale = 2 // 提高清晰度
    const W = this.data.frameW
    const H = this.data.frameH

    canvas.width = W * scale
    canvas.height = H * scale
    ctx.scale(scale, scale)

    // 整体背景白色（也是 cell 之间留白颜色）
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    const cells = this.data.cells
    const images = this.data.selectedImages

    // 依次加载图片再绘制
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
        // 区块底色白色
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(cell.x, cell.y, cell.w, cell.h)

        const src = images[i]
        if (!src) continue
        try {
          const img = await loadImg(src)
          const iw = img.width || 1
          const ih = img.height || 1
          const cellRatio = cell.w / cell.h
          const imgRatio = iw / ih
          let dw
          let dh
          let dx
          let dy
          // aspectFit / contain
          if (imgRatio > cellRatio) {
            dw = cell.w
            dh = cell.w / imgRatio
            dx = cell.x
            dy = cell.y + (cell.h - dh) / 2
          } else {
            dh = cell.h
            dw = cell.h * imgRatio
            dy = cell.y
            dx = cell.x + (cell.w - dw) / 2
          }
          ctx.drawImage(img, dx, dy, dw, dh)
        } catch (e) {
          // 单图失败不中断整体
        }
      }

      wx.canvasToTempFilePath({
        canvas,
        success: r => {
          wx.saveImageToPhotosAlbum({
            filePath: r.tempFilePath,
            success: () => {
              wx.hideLoading()
              wx.showToast({ title: '保存成功' })
            },
            fail: err => {
              wx.hideLoading()
              const msg = (err && err.errMsg) || ''
              if (msg.indexOf('auth') > -1 || msg.indexOf('cancel') > -1) {
                wx.showModal({
                  title: '提示',
                  content: '需要授权访问相册才能保存图片',
                  confirmText: '去设置',
                  success: m => {
                    if (m.confirm) wx.openSetting()
                  }
                })
              } else {
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
