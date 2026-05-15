Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    selectedImage: null,
    imgWidth: 0,
    imgHeight: 0,
    previewWidth: 0,
    previewHeight: 0,
    modeType: 'fixed',
    activeTab: 0,
    activeGridIndex: 0,
    gridCols: 2,
    gridRows: 2,
    gridList: [
      { cols: 2, rows: 2, name: '四宫格' },

      
      { cols: 3, rows: 3, name: '九宫格' },
      { cols: 4, rows: 4, name: '十六宫格' },
      { cols: 3, rows: 2, name: '3×2' },
      { cols: 2, rows: 3, name: '2×3' }
    ],
    gridCells: []
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync()
    const statusBarHeight = systemInfo.statusBarHeight
    const menuButton = wx.getMenuButtonBoundingClientRect()
    const navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height
    this.setData({
      statusBarHeight,
      navBarHeight
    })
    this.initGrid()
  },

  initGrid() {
    const { gridCols, gridRows } = this.data
    const cells = []
    for (let i = 0; i < gridCols * gridRows; i++) {
      cells.push(i)
    }
    this.setData({ gridCells: cells })
  },

  getPreviewSize() {
    const query = wx.createSelectorQuery().in(this)
    query.select('.preview-box').boundingClientRect(rect => {
      if (!rect) return
      this.setData({
        previewWidth: rect.width,
        previewHeight: rect.height
      })
    }).exec()
  },

  onTabChange(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ activeTab: index })
  },

  onModeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ modeType: type })
  },

  onGridSelect(e) {
    const index = e.currentTarget.dataset.index
    const grid = this.data.gridList[index]
    const cells = []
    for (let i = 0; i < grid.cols * grid.rows; i++) {
      cells.push(i)
    }
    this.setData({
      activeGridIndex: index,
      gridCols: grid.cols,
      gridRows: grid.rows,
      gridCells: cells
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
            this.setData({
              selectedImage: path,
              imgWidth: iw,
              imgHeight: ih
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

  onBack() {
    wx.navigateBack()
  }
})