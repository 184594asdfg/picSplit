Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    selectedImage: null,
    imgWidth: 0,
    imgHeight: 0,
    previewWidth: 0,
    previewHeight: 0,
    gridOverlayStyle: '',
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
      { cols: 2, rows: 3, name: '2×3' },
      { cols: 2, rows: 4, name: '2×4' },
      { cols: 4, rows: 2, name: '4×2' },
      { cols: 3, rows: 4, name: '3×4' },
      { cols: 4, rows: 3, name: '4×3' }
    ],
    tabList: [
      { index: 0, name: '网格' },
      { index: 1, name: '纵向' },
      { index: 2, name: '横向' }
    ],
    gridCells: [],
    selectedCells: []
  },

  onLoad(options) {
    const systemInfo = wx.getSystemInfoSync()
    const statusBarHeight = systemInfo.statusBarHeight
    const menuButton = wx.getMenuButtonBoundingClientRect()
    const navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height
    this.setData({
      statusBarHeight,
      navBarHeight
    })
    this.initGrid()
    
    // 检查是否有传递过来的图片
    if (options.image) {
      const imagePath = decodeURIComponent(options.image)
      this.setImageFromPath(imagePath)
    }
  },

  setImageFromPath(path) {
    this.setData({ selectedImage: path })
    wx.getImageInfo({
      src: path,
      success: (info) => {
        this.setData({ imgWidth: info.width, imgHeight: info.height })
        setTimeout(() => this.calculateGridOverlay(), 100)
      }
    })
  },

  onImageLoad() {
    this.calculateGridOverlay()
  },

  calculateGridOverlay() {
    const { imgWidth, imgHeight } = this.data
    if (!imgWidth || !imgHeight) return

    const query = wx.createSelectorQuery().in(this)
    query.select('.image-container').boundingClientRect()
    query.exec((res) => {
      const container = res[0]
      if (!container) return

      const imgRatio = imgWidth / imgHeight
      const containerRatio = container.width / container.height

      let displayWidth, displayHeight, offsetX, offsetY

      if (imgRatio > containerRatio) {
        displayWidth = container.width
        displayHeight = container.width / imgRatio
        offsetX = 0
        offsetY = (container.height - displayHeight) / 2
      } else {
        displayWidth = container.height * imgRatio
        displayHeight = container.height
        offsetX = (container.width - displayWidth) / 2
        offsetY = 0
      }

      this.setData({
        gridOverlayStyle: `left:${offsetX}px;top:${offsetY}px;width:${displayWidth}px;height:${displayHeight}px;`
      })
    })
  },

  initGrid() {
    const { gridCols, gridRows } = this.data
    const cells = []
    for (let i = 0; i < gridCols * gridRows; i++) {
      const col = i % gridCols
      const row = Math.floor(i / gridCols)
      cells.push({
        index: i,
        col: col,
        row: row,
        isFirstRow: row === 0,
        isFirstCol: col === 0,
        isLastCol: col === gridCols - 1,
        isLastRow: row === gridRows - 1
      })
    }
    this.setData({ 
      gridCells: cells,
      selectedCells: []
    })
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
    const index = parseInt(e.currentTarget.dataset.index, 10)
    this.setData({
      activeTab: index,
      selectedCells: []
    })
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
      const col = i % grid.cols
      const row = Math.floor(i / grid.cols)
      cells.push({
        index: i,
        col: col,
        row: row,
        isLastCol: col === grid.cols - 1,
        isLastRow: row === grid.rows - 1
      })
    }
    this.setData({
      activeGridIndex: index,
      gridCols: grid.cols,
      gridRows: grid.rows,
      gridCells: cells,
      selectedCells: []
    })
  },

  onCellTap(e) {
    const index = e.currentTarget.dataset.index
    const { activeTab, gridCols, gridRows, selectedCells } = this.data
    const newSelectedCells = [...selectedCells]

    if (activeTab === 0) {
      const cellIndex = newSelectedCells.indexOf(index)
      if (cellIndex > -1) {
        newSelectedCells.splice(cellIndex, 1)
      } else {
        newSelectedCells.push(index)
      }
    } else if (activeTab === 1) {
      const col = index % gridCols
      const colCells = []
      for (let row = 0; row < gridRows; row++) {
        colCells.push(row * gridCols + col)
      }
      const isColSelected = colCells.every(cell => newSelectedCells.includes(cell))
      if (isColSelected) {
        colCells.forEach(cell => {
          const idx = newSelectedCells.indexOf(cell)
          if (idx > -1) newSelectedCells.splice(idx, 1)
        })
      } else {
        colCells.forEach(cell => {
          if (!newSelectedCells.includes(cell)) newSelectedCells.push(cell)
        })
      }
    } else if (activeTab === 2) {
      const row = Math.floor(index / gridCols)
      const rowCells = []
      for (let col = 0; col < gridCols; col++) {
        rowCells.push(row * gridCols + col)
      }
      const isRowSelected = rowCells.every(cell => newSelectedCells.includes(cell))
      if (isRowSelected) {
        rowCells.forEach(cell => {
          const idx = newSelectedCells.indexOf(cell)
          if (idx > -1) newSelectedCells.splice(idx, 1)
        })
      } else {
        rowCells.forEach(cell => {
          if (!newSelectedCells.includes(cell)) newSelectedCells.push(cell)
        })
      }
    }
    this.setData({ selectedCells: newSelectedCells })
  },

  onChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFilePaths[0]
        this.setImageFromPath(path)
        wx.showToast({ title: '图片已选择', icon: 'success' })
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