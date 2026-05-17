const BORDER_SIZES = ['small', 'medium', 'large', 'none']
const BORDER_LABELS = {
  small: '小边框',
  medium: '中边框',
  large: '大边框',
  none: '无边框'
}
const BORDER_PADDING = {
  none: 8,
  small: 16,
  medium: 28,
  large: 48
}

/** 格子之间的间距（画布逻辑像素） */
const CELL_GAP = {
  none: 8,
  small: 12,
  medium: 20,
  large: 32
}

/** 各模板外框宽高比，与 test2.html 一致（逻辑像素） */
const TEMPLATE_ASPECT = {
  border: { w: 1, h: 1 },
  '2h': { w: 100, h: 160 },
  '2v': { w: 160, h: 100 },
  '3h': { w: 180, h: 100 },
  '4h': { w: 200, h: 80 },
  '3x2': { w: 180, h: 100 },
  '3v': { w: 100, h: 160 },
  '4v': { w: 100, h: 160 },
  '2x2': { w: 1, h: 1 },
  '3x3': { w: 1, h: 1 }
}

const CANVAS_BASE = 1080

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    templates: [
      { type: 'border', count: 1, slots: [0], iconShape: 'square' },
      { type: '2h', count: 2, slots: [0, 1], iconShape: 'tall' },
      { type: '2v', count: 2, slots: [0, 1], iconShape: 'wide' },
      { type: '3h', count: 3, slots: [0, 1, 2], iconShape: 'wide-lg' },
      { type: '4h', count: 4, slots: [0, 1, 2, 3], iconShape: 'wide-sm' },
      { type: '3x2', count: 6, slots: [0, 1, 2, 3, 4, 5], iconShape: 'wide-lg' },
      { type: '3v', count: 3, slots: [0, 1, 2], iconShape: 'tall' },
      { type: '4v', count: 4, slots: [0, 1, 2, 3], iconShape: 'tall' },
      { type: '2x2', count: 4, slots: [0, 1, 2, 3], iconShape: 'square' },
      { type: '3x3', count: 9, slots: [0, 1, 2, 3, 4, 5, 6, 7, 8], iconShape: 'square-lg' }
    ],
    selectedTemplateIndex: 1,
    selectedTemplate: { type: '2h', count: 2, slots: [0, 1], iconShape: 'tall' },
    borderSize: 'small',
    borderSizeLabel: '小边框',
    selectedImages: [],
    maxImages: 9,
    currentEditIndex: -1
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight
    })
  },

  onBack() {
    wx.navigateBack()
  },

  onSelectTemplate(e) {
    const index = e.currentTarget.dataset.index
    const template = this.data.templates[index]
    this.setData({
      selectedTemplateIndex: index,
      selectedTemplate: template,
      maxImages: template.count
    })
  },

  onTapBorderControl() {
    const currentIndex = BORDER_SIZES.indexOf(this.data.borderSize)
    const nextSize = BORDER_SIZES[(currentIndex + 1) % BORDER_SIZES.length]
    const borderTemplate = this.data.templates[0]
    this.setData({
      borderSize: nextSize,
      borderSizeLabel: BORDER_LABELS[nextSize],
      selectedTemplateIndex: 0,
      selectedTemplate: borderTemplate,
      maxImages: borderTemplate.count
    })
  },

  getBorderPadding() {
    return BORDER_PADDING[this.data.borderSize] ?? BORDER_PADDING.small
  },

  getCellGap() {
    return CELL_GAP[this.data.borderSize] ?? CELL_GAP.small
  },

  /** 按 test2 外框比例计算导出画布尺寸（短边对齐 CANVAS_BASE） */
  getCanvasSize(templateType) {
    const aspect = TEMPLATE_ASPECT[templateType] || { w: 1, h: 1 }
    const base = CANVAS_BASE

    if (aspect.w === aspect.h) {
      return { width: base, height: base }
    }
    if (aspect.w > aspect.h) {
      return {
        width: Math.round((base * aspect.w) / aspect.h),
        height: base
      }
    }
    return {
      width: base,
      height: Math.round((base * aspect.h) / aspect.w)
    }
  },

  calcCellRect(template, index, canvasWidth, canvasHeight, baseWidth) {
    const p = this.getBorderPadding()
    const g = this.getCellGap()

    if (template.type === 'border') {
      return {
        x: p,
        y: p,
        w: canvasWidth - p * 2,
        h: canvasHeight - p * 2
      }
    }

    if (template.type === '2h') {
      const n = 2
      const cellH = (canvasHeight - p * 2 - g * (n - 1)) / n
      return { x: p, y: p + index * (cellH + g), w: canvasWidth - p * 2, h: cellH }
    }

    if (template.type === '2v') {
      const n = 2
      const cellW = (canvasWidth - p * 2 - g * (n - 1)) / n
      return { x: p + index * (cellW + g), y: p, w: cellW, h: canvasHeight - p * 2 }
    }

    if (template.type === '3h') {
      const n = 3
      const cellW = (canvasWidth - p * 2 - g * (n - 1)) / n
      return { x: p + index * (cellW + g), y: p, w: cellW, h: canvasHeight - p * 2 }
    }

    if (template.type === '4h') {
      const n = 4
      const cellW = (canvasWidth - p * 2 - g * (n - 1)) / n
      return { x: p + index * (cellW + g), y: p, w: cellW, h: canvasHeight - p * 2 }
    }

    if (template.type === '3x2') {
      const cols = 3
      const rows = 2
      const cellW = (canvasWidth - p * 2 - g * (cols - 1)) / cols
      const cellH = (canvasHeight - p * 2 - g * (rows - 1)) / rows
      const col = index % cols
      const row = Math.floor(index / cols)
      return {
        x: p + col * (cellW + g),
        y: p + row * (cellH + g),
        w: cellW,
        h: cellH
      }
    }

    if (template.type === '3v') {
      const n = 3
      const cellH = (canvasHeight - p * 2 - g * (n - 1)) / n
      return { x: p, y: p + index * (cellH + g), w: canvasWidth - p * 2, h: cellH }
    }

    if (template.type === '4v') {
      const n = 4
      const cellH = (canvasHeight - p * 2 - g * (n - 1)) / n
      return { x: p, y: p + index * (cellH + g), w: canvasWidth - p * 2, h: cellH }
    }

    if (template.type === '2x2') {
      const n = 2
      const cellW = (canvasWidth - p * 2 - g * (n - 1)) / n
      const cellH = (canvasHeight - p * 2 - g * (n - 1)) / n
      const col = index % 2
      const row = Math.floor(index / 2)
      return {
        x: p + col * (cellW + g),
        y: p + row * (cellH + g),
        w: cellW,
        h: cellH
      }
    }

    if (template.type === '3x3') {
      const n = 3
      const cellW = (canvasWidth - p * 2 - g * (n - 1)) / n
      const cellH = (canvasHeight - p * 2 - g * (n - 1)) / n
      const col = index % 3
      const row = Math.floor(index / 3)
      return {
        x: p + col * (cellW + g),
        y: p + row * (cellH + g),
        w: cellW,
        h: cellH
      }
    }

    return { x: 0, y: 0, w: baseWidth, h: baseWidth }
  },

  onChooseImages() {
    const remainingCount = this.data.selectedTemplate.count
    wx.chooseImage({
      count: remainingCount,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const selectedImages = res.tempFilePaths.slice(0, this.data.selectedTemplate.count)
        this.setData({
          selectedImages: selectedImages
        })
        wx.showToast({ title: '已选择' + selectedImages.length + '张图片', icon: 'success' })
      }
    })
  },

  onTapBlock(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      currentEditIndex: index
    })
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const selectedImages = [...this.data.selectedImages]
        selectedImages[index] = res.tempFilePaths[0]
        this.setData({
          selectedImages: selectedImages
        })
      }
    })
  },

  onExpand() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  async onSavePuzzle() {
    if (this.data.selectedImages.length === 0) {
      wx.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }

    if (this._saving) return
    this._saving = true

    try {
      await this.ensureAlbumAuth()
      wx.showLoading({ title: '生成中...', mask: true })

      const tempFilePath = await this.createPuzzle()
      await this.saveImg(tempFilePath)

      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success', duration: 1000 })

      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/result/result?images=${encodeURIComponent(JSON.stringify([tempFilePath]))}`
        })
      }, 1000)
    } catch (e) {
      wx.hideLoading()
      const msg = (e && e.errMsg) || (e && e.message) || '保存失败'
      if (msg.indexOf('cancel') === -1 && msg.indexOf('取消') === -1) {
        wx.showToast({ title: msg, icon: 'none' })
      }
    } finally {
      this._saving = false
    }
  },

  createPuzzle() {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery().in(this)
      query.select('#puzzleCanvas').fields({ node: true, size: true }).exec(async (res) => {
        if (!res[0]?.node) {
          return reject('canvas 错误')
        }
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')

        const template = this.data.selectedTemplate
        const images = this.data.selectedImages

        const { width: canvasWidth, height: canvasHeight } = this.getCanvasSize(template.type)

        canvas.width = canvasWidth
        canvas.height = canvasHeight

        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        for (let i = 0; i < images.length; i++) {
          const imgPath = images[i]
          if (!imgPath) continue

          try {
            const imgInfo = await this.getImageInfo(imgPath)
            const img = canvas.createImage()
            await new Promise((resolveImg, rejectImg) => {
              img.onload = () => resolveImg()
              img.onerror = (err) => rejectImg(err)
              img.src = imgPath
            })

            const { x, y, w, h } = this.calcCellRect(template, i, canvasWidth, canvasHeight, CANVAS_BASE)

            const scale = Math.max(w / img.width, h / img.height)
            const drawW = img.width * scale
            const drawH = img.height * scale
            const drawX = x + (w - drawW) / 2
            const drawY = y + (h - drawH) / 2

            ctx.drawImage(img, drawX, drawY, drawW, drawH)
          } catch (err) {
            console.error('绘制图片失败:', err)
          }
        }

        wx.canvasToTempFilePath({
          canvas,
          quality: 1,
          fileType: 'jpg',
          success: (r) => resolve(r.tempFilePath),
          fail: reject
        })
      })
    })
  },

  getImageInfo(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src,
        success: resolve,
        fail: reject
      })
    })
  },

  ensureAlbumAuth() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          const auth = res.authSetting['scope.writePhotosAlbum']
          if (auth === true) {
            resolve()
          } else if (auth === false) {
            wx.showModal({
              title: '保存提示',
              content: '需要授权保存图片到相册，是否前往设置？',
              success: (modalRes) => {
                if (!modalRes.confirm) {
                  reject(new Error('用户取消授权'))
                  return
                }
                wx.openSetting({
                  success: (setRes) => {
                    if (setRes.authSetting['scope.writePhotosAlbum']) {
                      resolve()
                    } else {
                      reject(new Error('未授权保存到相册'))
                    }
                  },
                  fail: () => reject(new Error('打开设置失败'))
                })
              }
            })
          } else {
            wx.authorize({
              scope: 'scope.writePhotosAlbum',
              success: resolve,
              fail: () => reject(new Error('未授权保存到相册'))
            })
          }
        },
        fail: () => reject(new Error('获取授权信息失败'))
      })
    })
  },

  saveImg(filePath) {
    return new Promise((resolve) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: resolve,
        fail: resolve
      })
    })
  }
})