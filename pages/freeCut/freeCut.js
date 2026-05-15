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
    tabList: [
      { index: 0, name: '网格' },
      { index: 1, name: '纵向' },
      { index: 2, name: '横向' }
    ],
    gridCells: [],
    selectedCells: []
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
      const col = i % gridCols
      const row = Math.floor(i / gridCols)
      cells.push({
        index: i,
        col: col,
        row: row,
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
    console.log('点击标签，index:', index, '当前activeTab:', this.data.activeTab)
    
    // 强制更新数据
    this.setData({
      activeTab: index,
      selectedCells: []
    }, () => {
      console.log('更新完成，activeTab现在是:', this.data.activeTab)
    })
  },

  onModeChange(e) {
    const type = e.currentTarget.dataset.type
    console.log('onModeChange', type)
    this.setData({ modeType: type })
  },

  onGridSelect(e) {
    const index = e.currentTarget.dataset.index
    console.log('onGridSelect', index)
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
      // 网格模式：单个单元格选择
      const cellIndex = newSelectedCells.indexOf(index)
      if (cellIndex > -1) {
        newSelectedCells.splice(cellIndex, 1)
      } else {
        newSelectedCells.push(index)
      }
    } else if (activeTab === 1) {
      // 纵向模式：选中整列
      const col = index % gridCols
      const colCells = []
      for (let row = 0; row < gridRows; row++) {
        colCells.push(row * gridCols + col)
      }
      // 检查整列是否已选中
      const isColSelected = colCells.every(cell => newSelectedCells.includes(cell))
      if (isColSelected) {
        // 取消选中
        colCells.forEach(cell => {
          const idx = newSelectedCells.indexOf(cell)
          if (idx > -1) newSelectedCells.splice(idx, 1)
        })
      } else {
        // 选中整列
        colCells.forEach(cell => {
          if (!newSelectedCells.includes(cell)) newSelectedCells.push(cell)
        })
      }
    } else if (activeTab === 2) {
      // 横向模式：选中整行
      const row = Math.floor(index / gridCols)
      const rowCells = []
      for (let col = 0; col < gridCols; col++) {
        rowCells.push(row * gridCols + col)
      }
      // 检查整行是否已选中
      const isRowSelected = rowCells.every(cell => newSelectedCells.includes(cell))
      if (isRowSelected) {
        // 取消选中
        rowCells.forEach(cell => {
          const idx = newSelectedCells.indexOf(cell)
          if (idx > -1) newSelectedCells.splice(idx, 1)
        })
      } else {
        // 选中整行
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