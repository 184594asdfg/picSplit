Page({
  data: {
    shapes: [
      { id: 1, icon: '/images/masks/square.png' },
    ],
    selectedShape: 1,
    selectedImage: null,
    currentShapeIcon: '/images/masks/square.png',

    // 预览容器尺寸（px）
    preW: 0,
    preH: 0,

    // 图片在预览中的显示尺寸与位置（aspectFit 居中，单位 px）
    imgW: 0,
    imgH: 0,
    imgX: 0,
    imgY: 0,

    // 原图尺寸
    originalW: 0,
    originalH: 0
  },

  onLoad() {
    this.getPreviewSize()
  },

  getPreviewSize() {
    const query = wx.createSelectorQuery().in(this)
    query.select('.preview-area').boundingClientRect(rect => {
      if (!rect) return
      this.setData({
        preW: rect.width,
        preH: rect.height
      })
      if (this.data.selectedImage && this.data.originalW) {
        this.applyDisplay(this.data.originalW, this.data.originalH)
      }
    }).exec()
  },

  onSelectShape(e) {
    const id = e.currentTarget.dataset.id
    const shape = this.data.shapes.find(s => s.id === id)
    this.setData({
      selectedShape: id,
      currentShapeIcon: shape ? shape.icon : ''
    })
  },

  // 按 aspectFit 将图片完整放入预览框，居中显示
  applyDisplay(iw, ih) {
    const pw = this.data.preW
    const ph = this.data.preH
    if (!pw || !ph || !iw || !ih) return
    const scale = Math.min(pw / iw, ph / ih)
    const showW = iw * scale
    const showH = ih * scale
    this.setData({
      imgW: showW,
      imgH: showH,
      imgX: (pw - showW) / 2,
      imgY: (ph - showH) / 2
    })
  },

  onChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFilePaths[0]
        wx.getImageInfo({
          src: path,
          success: (info) => {
            this.setData({
              selectedImage: info.path || path,
              originalW: info.width,
              originalH: info.height
            })
            this.applyDisplay(info.width, info.height)
            wx.showToast({ title: '图片已选择', icon: 'success' })
          },
          fail: () => {
            wx.showToast({ title: '读取图片失败', icon: 'none' })
          }
        })
      }
    })
  },

  async onSaveImage() {
    if (!this.data.selectedImage) {
      wx.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }
    if (this._saving) return
    this._saving = true

    try {
      await this.ensureAlbumAuth()

      const src = this.data.selectedImage

      // 以最终用于切图的"原始原图"为准重新拿一次真实像素尺寸，
      // 避免预览阶段缓存到的尺寸与实际原图不一致导致切偏
      const realInfo = await this.getImageInfoSafe(src)
      const originalW = realInfo.width
      const originalH = realInfo.height

      if (!originalW || !originalH) {
        throw new Error('读取原图尺寸失败')
      }

      // 严格按横向 3 等分、纵向 3 等分裁切原图
      // 用整数像素边界严格均分，9 块完整覆盖原图：无间隙、无重叠、无丢失
      // 不扣除任何"白色缝隙/黑色底"等预览叠加层的宽度
      const colXs = [
        0,
        Math.round(originalW / 3),
        Math.round((originalW * 2) / 3),
        originalW
      ]
      const rowYs = [
        0,
        Math.round(originalH / 3),
        Math.round((originalH * 2) / 3),
        originalH
      ]

      const previewList = []
      const total = 9

      // 顺序：从上到下，从左到右；全程只对 src（用户上传的原始原图）做裁切
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const index = row * 3 + col
          wx.showLoading({ title: `正在保存 ${index + 1}/${total}`, mask: true })
          const px = colXs[col]
          const py = rowYs[row]
          const pw = colXs[col + 1] - colXs[col]
          const ph = rowYs[row + 1] - rowYs[row]
          const piecePath = await this.cropImageByCanvas(src, px, py, pw, ph)
          await this.saveToAlbum(piecePath)
          previewList.push(piecePath)
        }
      }

      wx.hideLoading()

      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/result/result?source=grid&images=${encodeURIComponent(JSON.stringify(previewList))}`
        })
      }, 500)
    } catch (err) {
      wx.hideLoading()
      const msg = (err && err.errMsg) || (err && err.message) || '保存失败'
      if (msg.indexOf('cancel') === -1 && msg.indexOf('取消') === -1) {
        wx.showToast({ title: msg, icon: 'none' })
      }
    } finally {
      this._saving = false
    }
  },

  getImageInfoSafe(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src,
        success: (info) => resolve(info),
        fail: (e) => reject(e)
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

  cropImageByCanvas(src, sx, sy, sw, sh) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery().in(this)
      query.select('#cutCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          reject(new Error('canvas 节点获取失败'))
          return
        }
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')

        const outputW = Math.max(1, Math.round(sw))
        const outputH = Math.max(1, Math.round(sh))
        canvas.width = outputW
        canvas.height = outputH

        const img = canvas.createImage()
        img.onload = () => {
          ctx.clearRect(0, 0, outputW, outputH)
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputW, outputH)
          wx.canvasToTempFilePath({
            canvas,
            x: 0,
            y: 0,
            width: outputW,
            height: outputH,
            destWidth: outputW,
            destHeight: outputH,
            fileType: 'jpg',
            quality: 1,
            success: (r) => resolve(r.tempFilePath),
            fail: (e) => reject(e)
          })
        }
        img.onerror = () => reject(new Error('图片解码失败'))
        img.src = src
      })
    })
  },

  saveToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: resolve,
        fail: reject
      })
    })
  }
})
