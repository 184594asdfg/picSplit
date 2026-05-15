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
    currentShapeIcon: '/images/masks/square.png'
  },

  onLoad() {
    this.setData({
      scrollIntoView: 'shape-1'
    })
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
        const tempFilePath = res.tempFilePaths[0]
        this.setData({
          selectedImage: tempFilePath
        })
        wx.showToast({
          title: '图片已选择',
          icon: 'success'
        })
      }
    })
  },

  onSaveImage() {
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })
  }
})
