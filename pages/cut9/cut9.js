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

  onSaveImage() {
    wx.showToast({ title: '保存成功', icon: 'success' })
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