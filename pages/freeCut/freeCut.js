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
    modeType: 'free',
    activeTab: 0,
    activeGridIndex: 0,
    gridCols: 2,
    gridRows: 2,

    horizontalLines: [],
    verticalLines: [],
    lineTouch: null,
    gridRect: null,

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
    verticalList: [
      { cols: 2, rows: 1, name: '2张' },
      { cols: 3, rows: 1, name: '3张' },
      { cols: 4, rows: 1, name: '4张' },
      { cols: 5, rows: 1, name: '5张' },
      { cols: 6, rows: 1, name: '6张' }
    ],
    horizontalList: [
      { cols: 1, rows: 2, name: '2张' },
      { cols: 1, rows: 3, name: '3张' },
      { cols: 1, rows: 4, name: '4张' },
      { cols: 1, rows: 5, name: '5张' },
      { cols: 1, rows: 6, name: '6张' }
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
    this.setData({ statusBarHeight, navBarHeight })
    this.initGrid()

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
    const { imgWidth, imgHeight, modeType, gridCols, gridRows } = this.data
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

      const gridOverlayStyle = `left:${offsetX}px;top:${offsetY}px;width:${displayWidth}px;height:${displayHeight}px;`
      this.setData({ gridOverlayStyle })

      this.setData({
        gridRect: {
          left: offsetX, top: offsetY,
          right: offsetX + displayWidth,
          bottom: offsetY + displayHeight,
          width: displayWidth, height: displayHeight
        }
      })

      if (modeType === 'free') {
        this.initFreeLines()
      } else {
        this.initGrid()
      }
    })
  },

  initFreeLines() {
    const { gridRect, gridCols, gridRows } = this.data
    if (!gridRect) return

    const vw = gridRect.width
    const vh = gridRect.height

    const vLines = []
    for (let i = 1; i < gridCols; i++) {
      vLines.push({ x: vw * i / gridCols })
    }

    const hLines = []
    for (let i = 1; i < gridRows; i++) {
      hLines.push({ y: vh * i / gridRows })
    }

    this.setData({ verticalLines: vLines, horizontalLines: hLines })
  },

  initGrid() {
    const { gridCols, gridRows } = this.data
    const cells = []
    for (let i = 0; i < gridCols * gridRows; i++) {
      const col = i % gridCols
      const row = Math.floor(i / gridCols)
      cells.push({
        index: i, col, row,
        isFirstRow: row === 0,
        isFirstCol: col === 0,
        isLastCol: col === gridCols - 1,
        isLastRow: row === gridRows - 1
      })
    }
    this.setData({ gridCells: cells, selectedCells: [] })
  },

  onTabChange(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({ activeTab: index, activeGridIndex: 0, selectedCells: [] })
    this.onGridSelect({ currentTarget: { dataset: { index: 0 } } })
  },

  onModeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ modeType: type })
    setTimeout(() => this.calculateGridOverlay(), 100)
  },

  onGridSelect(e) {
    const index = e.currentTarget.dataset.index
    const { activeTab, gridList, verticalList, horizontalList } = this.data
    let currentList = activeTab === 0 ? gridList : activeTab === 1 ? verticalList : horizontalList
    const grid = currentList[index]

    this.setData({
      activeGridIndex: index,
      gridCols: grid.cols,
      gridRows: grid.rows,
      selectedCells: []
    })

    setTimeout(() => this.calculateGridOverlay(), 100)
  },

  onCellTap(e) {
    const index = e.currentTarget.dataset.index
    const { selectedCells } = this.data
    const idx = selectedCells.indexOf(index)
    const newSelected = idx > -1 ? selectedCells.filter((_, i) => i !== idx) : [...selectedCells, index]
    this.setData({ selectedCells: newSelected })
  },

  // ========== 修复：完美跟手拖动 ==========
  onLineTouchStart(e) {
    const type = e.currentTarget.dataset.type
    const index = parseInt(e.currentTarget.dataset.index)
    const touch = e.touches[0]

    let originPos = 0
    if (type === 'h') {
      originPos = this.data.horizontalLines[index].y
    } else {
      originPos = this.data.verticalLines[index].x
    }

    this.setData({
      lineTouch: {
        type,
        index,
        offset: type === 'h' ? touch.clientY : touch.clientX,
        originPos
      }
    })
    return true
  },

  onLineTouchMove(e) {
    const { lineTouch, gridRect } = this.data
    if (!lineTouch || !gridRect) return true
    const touch = e.touches[0]

    if (lineTouch.type === 'h') {
      let nowY = touch.clientY - lineTouch.offset + lineTouch.originPos
      nowY = Math.max(0, Math.min(gridRect.height, nowY))
      let list = [...this.data.horizontalLines]
      list[lineTouch.index].y = nowY
      this.setData({ horizontalLines: list })
    } else {
      let nowX = touch.clientX - lineTouch.offset + lineTouch.originPos
      nowX = Math.max(0, Math.min(gridRect.width, nowX))
      let list = [...this.data.verticalLines]
      list[lineTouch.index].x = nowX
      this.setData({ verticalLines: list })
    }
    return true
  },

  onLineTouchEnd() {
    this.setData({ lineTouch: null })
    return true
  },
  // ======================================

  onChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFilePaths[0]
        this.setImageFromPath(path)
        wx.showToast({ title: '已选择', icon: 'success' })
      }
    })
  },

  onSaveImage() {
    wx.showToast({ title: '保存成功', icon: 'success' })
  },

  onBack() {
    wx.navigateBack()
  },

  preventMove() {},
})