Page({
  data: {
    shapes: [
      { id: 1, icon: '/images/masks/square.png' },
      { id: 2, icon: '/images/masks/circle.png' },
      { id: 3, icon: '/images/masks/clover.png' },
      { id: 4, icon: '/images/masks/cloud.png' },
      { id: 5, icon: '/images/masks/flower.png' },
      { id: 6, icon: '/images/masks/heart.png' },
      { id: 7, icon: '/images/masks/hex_mask.png' },
      { id: 8, icon: '/images/masks/blob_mask.png' },
      { id: 9, icon: '/images/masks/leaf_mask.png' },
      { id: 10, icon: '/images/masks/burst_mask.png' },
      { id: 11, icon: '/images/masks/spike_mask.png' },
      { id: 12, icon: '/images/masks/star_mask.png' }
    ],
    selectedShape: 1,
    gridCells: Array(9).fill(null),
    selectedImage: null,
    currentShapeIcon: '/images/masks/square.png',

    // 拖拽定位
    imgX: 0,
    imgY: 0,
    startX: 0,
    startY: 0,
    isDragging: false,
    // 图片实际宽高
    imgRealW: 0,
    imgRealH: 0,
    // 预览区宽高
    previewW: 0,
    previewH: 0
  },

  onLoad() {
    this.setData({
      scrollIntoView: 'shape-1'
    })
    // 获取预览区尺寸
    this.getPreviewRect()
  },

  // 获取preview-area尺寸
  getPreviewRect() {
    const query = wx.createSelectorQuery().in(this)
    query.select('.preview-area').boundingClientRect(res => {
      if (res) {
        this.setData({
          previewW: res.width,
          previewH: res.height
        })
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

  // 选择图片 + 自动适配：完整不裁剪、铺满预览区
  onChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        // 获取图片真实宽高
        wx.getImageInfo({
          src: tempFilePath,
          success: (imgInfo) => {
            const { width, height } = imgInfo
            this.setData({
              selectedImage: tempFilePath,
              imgRealW: width,
              imgRealH: height,
              imgX: 0,
              imgY: 0
            })
            wx.showToast({
              title: '图片已选择',
              icon: 'success'
            })
          }
        })
      }
    })
  },

  onSaveImage() {
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })
  },

  // 拖拽开始
  touchStart(e) {
    if (!this.data.selectedImage) return
    this.setData({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      isDragging: true
    })
  },

  // 拖拽移动 + 边界限制
  touchMove(e) {
    if (!this.data.isDragging || !this.data.selectedImage) return

    const dx = e.touches[0].clientX - this.data.startX
    const dy = e.touches[0].clientY - this.data.startY

    let newX = this.data.imgX + dx
    let newY = this.data.imgY + dy

    // 计算图片缩放后实际显示宽高（contain完整显示）
    const { previewW, previewH, imgRealW, imgRealH } = this.data
    const scale = Math.min(previewW / imgRealW, previewH / imgRealH)
    const showW = imgRealW * scale
    const showH = imgRealH * scale

    // 边界约束：不让图片移出预览区
    const maxX = (previewW - showW) / 2
    const minX = -maxX
    const maxY = (previewH - showH) / 2
    const minY = -maxY

    newX = Math.max(minX, Math.min(maxX, newX))
    newY = Math.max(minY, Math.min(maxY, newY))

    this.setData({
      imgX: newX,
      imgY: newY,
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY
    })
  },

  // 拖拽结束
  touchEnd() {
    this.setData({
      isDragging: false
    })
  }
})