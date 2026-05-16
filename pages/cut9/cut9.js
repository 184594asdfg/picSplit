Page({
  data: {
    shapes: [
      { id: 1, icon: '/images/masks/square.png' },
    ],
    selectedShape: 1,
    gridCells: Array(9).fill(null),
    selectedImage: null,
    currentShapeIcon: '/images/masks/square.png',

    imgX: 0,
    imgY: 0,
    startX: 0,
    startY: 0,
    isDragging: false,
    imgW: 0,
    imgH: 0,
    preW: 0,
    preH: 0
  },

  onLoad() {
    this.setData({
      scrollIntoView: 'shape-1'
    })
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
            const iw = info.width
            const ih = info.height
            const pw = this.data.preW
            const ph = this.data.preH

            const scaleW = pw / iw
            const scaleH = ph / ih
            const scale = Math.max(scaleW, scaleH)

            const showW = iw * scale
            const showH = ih * scale

            this.setData({
              selectedImage: path,
              imgW: showW,
              imgH: showH,
              imgX: (pw - showW) / 2,
              imgY: (ph - showH) / 2
            })

            wx.showToast({ title: '图片已选择', icon: 'success' })
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

      const cropInfo = await this.computeCropInfo()
      const previewList = []
      const total = 10

      const pieceW = cropInfo.sw / 3
      const pieceH = cropInfo.sh / 3
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const index = row * 3 + col
          wx.showLoading({ title: `正在保存 ${index + 1}/${total}`, mask: true })
          const px = cropInfo.sx + col * pieceW
          const py = cropInfo.sy + row * pieceH
          const piecePath = await this.cropImageByCanvas(cropInfo.src, px, py, pieceW, pieceH)
          await this.saveToAlbum(piecePath)
          previewList.push(piecePath)
        }
      }

      wx.showLoading({ title: `正在保存 ${total}/${total}`, mask: true })
      const completePath = await this.cropImageByCanvas(cropInfo.src, cropInfo.sx, cropInfo.sy, cropInfo.sw, cropInfo.sh)
      await this.saveToAlbum(completePath)
      previewList.push(completePath)

      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success', duration: 1000 })

      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/result/result?images=${encodeURIComponent(JSON.stringify(previewList))}`
        })
      }, 1000)
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

  computeCropInfo() {
    return new Promise((resolve, reject) => {
      const { selectedImage, imgX, imgY, imgW, imgH, preW, preH } = this.data
      wx.getImageInfo({
        src: selectedImage,
        success: (info) => {
          const scale = imgW / info.width
          const sx = Math.max(0, -imgX / scale)
          const sy = Math.max(0, -imgY / scale)
          const sw = Math.min(info.width - sx, preW / scale)
          const sh = Math.min(info.height - sy, preH / scale)
          resolve({
            src: info.path || selectedImage,
            sx,
            sy,
            sw,
            sh,
            originalW: info.width,
            originalH: info.height
          })
        },
        fail: () => reject(new Error('读取图片信息失败'))
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
  },

  touchStart(e) {
    if (!this.data.selectedImage) return
    this.setData({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      isDragging: true
    })
  },

  touchMove(e) {
    if (!this.data.isDragging || !this.data.selectedImage) return

    const dx = e.touches[0].clientX - this.data.startX
    const dy = e.touches[0].clientY - this.data.startY

    let newX = this.data.imgX + dx
    let newY = this.data.imgY + dy

    const { preW, preH, imgW, imgH } = this.data

    const minX = preW - imgW
    const maxX = 0
    const minY = preH - imgH
    const maxY = 0

    newX = Math.max(minX, Math.min(maxX, newX))
    newY = Math.max(minY, Math.min(maxY, newY))

    this.setData({
      imgX: newX,
      imgY: newY,
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY
    })
    
    return false // 加这一行：阻止默认滚动行为
  },

  touchEnd() {
    this.setData({ isDragging: false })
  }
})