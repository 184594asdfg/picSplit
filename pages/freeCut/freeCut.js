Page({
  data: {
    selectedImage: null,
    imgWidth: 0,
    imgHeight: 0,
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
    selectedCells: [],

    // 自由模式：每格在所在轴上的占比，sum = 1
    colFractions: [],
    rowFractions: [],
    // 自由模式分割线相对 grid-frame 的位置百分比（0-100）
    colDividers: [],
    rowDividers: [],

    // 固定模式：网格在图片显示区域内的偏移和尺寸（单位 px）
    fixedGridW: 0,
    fixedGridH: 0,
    fixedOffsetX: 0,
    fixedOffsetY: 0,

    // 当前 grid-frame 的 inline style
    frameStyle: ''
  },

  onLoad(options) {
    this.initLayout()

    if (options && options.image) {
      const imagePath = decodeURIComponent(options.image)
      this.setImageFromPath(imagePath)
    }
  },

  setImageFromPath(path) {
    this.setData({
      selectedImage: path,
      selectedCells: []
    })
    wx.getImageInfo({
      src: path,
      success: (info) => {
        this.setData({ imgWidth: info.width, imgHeight: info.height })
      },
      fail: (err) => {
        console.error('获取图片信息失败', err)
        wx.showToast({ title: '读取图片失败', icon: 'none' })
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
      if (!container || !container.width || !container.height) return

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

      this._displaySize = { width: displayWidth, height: displayHeight }

      this.setData({
        gridOverlayStyle: `left:${offsetX}px;top:${offsetY}px;width:${displayWidth}px;height:${displayHeight}px;`
      })
      this.recomputeFixedGrid(true)
      this.applyFrameStyle()
    })
  },

  buildCells(cols, rows) {
    const cells = []
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      cells.push({
        index: i,
        col,
        row,
        isFirstRow: row === 0,
        isFirstCol: col === 0,
        isLastCol: col === cols - 1,
        isLastRow: row === rows - 1
      })
    }
    return cells
  },

  computeDividers(fractions) {
    const dividers = []
    let sum = 0
    for (let i = 0; i < fractions.length - 1; i++) {
      sum += fractions[i]
      dividers.push(+(sum * 100).toFixed(4))
    }
    return dividers
  },

  initLayout() {
    const { gridCols, gridRows } = this.data
    const colFractions = Array(gridCols).fill(1 / gridCols)
    const rowFractions = Array(gridRows).fill(1 / gridRows)
    this.setData({
      gridCells: this.buildCells(gridCols, gridRows),
      colFractions,
      rowFractions,
      colDividers: this.computeDividers(colFractions),
      rowDividers: this.computeDividers(rowFractions),
      selectedCells: []
    })
    this.recomputeFixedGrid(true)
    this.applyFrameStyle()
  },

  // 重置当前 grid 对应的布局参数（cols/rows 变化或切换 tab/规格时调用）
  resetLayout() {
    const { gridCols, gridRows } = this.data
    const colFractions = Array(gridCols).fill(1 / gridCols)
    const rowFractions = Array(gridRows).fill(1 / gridRows)
    this.setData({
      colFractions,
      rowFractions,
      colDividers: this.computeDividers(colFractions),
      rowDividers: this.computeDividers(rowFractions)
    })
    this.recomputeFixedGrid(true)
    this.applyFrameStyle()
  },

  // 计算固定模式下的网格尺寸（保证每格为正方形）
  // recenter=true 时把 grid 居中，否则保留当前 offset 但 clamp 到边界内
  recomputeFixedGrid(recenter) {
    if (!this._displaySize) {
      this.setData({ fixedGridW: 0, fixedGridH: 0, fixedOffsetX: 0, fixedOffsetY: 0 })
      return
    }
    const { width, height } = this._displaySize
    const { gridCols, gridRows } = this.data
    const cellSize = Math.min(width / gridCols, height / gridRows)
    const fixedGridW = cellSize * gridCols
    const fixedGridH = cellSize * gridRows

    let offsetX, offsetY
    if (recenter) {
      offsetX = (width - fixedGridW) / 2
      offsetY = (height - fixedGridH) / 2
    } else {
      offsetX = Math.max(0, Math.min(width - fixedGridW, this.data.fixedOffsetX))
      offsetY = Math.max(0, Math.min(height - fixedGridH, this.data.fixedOffsetY))
    }

    this.setData({
      fixedGridW,
      fixedGridH,
      fixedOffsetX: offsetX,
      fixedOffsetY: offsetY
    })
  },

  applyFrameStyle() {
    const {
      modeType, gridCols, gridRows,
      colFractions, rowFractions,
      fixedOffsetX, fixedOffsetY, fixedGridW, fixedGridH
    } = this.data

    let style
    if (modeType === 'free') {
      const colCss = colFractions.map(f => `${(f * 100).toFixed(4)}%`).join(' ')
      const rowCss = rowFractions.map(f => `${(f * 100).toFixed(4)}%`).join(' ')
      style = `left:0;top:0;width:100%;height:100%;grid-template-columns:${colCss};grid-template-rows:${rowCss};`
    } else {
      style = `left:${fixedOffsetX}px;top:${fixedOffsetY}px;width:${fixedGridW}px;height:${fixedGridH}px;grid-template-columns:repeat(${gridCols},1fr);grid-template-rows:repeat(${gridRows},1fr);`
    }
    this.setData({ frameStyle: style })
  },

  getCurrentList(activeTab) {
    const { gridList, verticalList, horizontalList } = this.data
    if (activeTab === 1) return verticalList
    if (activeTab === 2) return horizontalList
    return gridList
  },

  onTabChange(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10)
    const currentList = this.getCurrentList(index)
    const grid = currentList[0]
    this.setData({
      activeTab: index,
      activeGridIndex: 0,
      gridCols: grid.cols,
      gridRows: grid.rows,
      gridCells: this.buildCells(grid.cols, grid.rows),
      selectedCells: []
    })
    this.resetLayout()
  },

  onModeChange(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.modeType) return
    this.setData({ modeType: type })
    if (type === 'fixed') {
      this.recomputeFixedGrid(true)
    }
    this.applyFrameStyle()
  },

  onGridSelect(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10)
    const currentList = this.getCurrentList(this.data.activeTab)
    const grid = currentList[index]
    if (!grid) return
    this.setData({
      activeGridIndex: index,
      gridCols: grid.cols,
      gridRows: grid.rows,
      gridCells: this.buildCells(grid.cols, grid.rows),
      selectedCells: []
    })
    this.resetLayout()
  },

  onCellTap(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(index)) return
    this.handleCellTap(index)
  },

  handleCellTap(index) {
    const { activeTab, gridCols, gridRows, selectedCells } = this.data
    const newSelectedCells = [...selectedCells]

    const toggleCells = (cells) => {
      const allSelected = cells.every(c => newSelectedCells.includes(c))
      if (allSelected) {
        cells.forEach(c => {
          const idx = newSelectedCells.indexOf(c)
          if (idx > -1) newSelectedCells.splice(idx, 1)
        })
      } else {
        cells.forEach(c => {
          if (!newSelectedCells.includes(c)) newSelectedCells.push(c)
        })
      }
    }

    if (activeTab === 0) {
      toggleCells([index])
    } else if (activeTab === 1) {
      const col = index % gridCols
      const colCells = []
      for (let row = 0; row < gridRows; row++) {
        colCells.push(row * gridCols + col)
      }
      toggleCells(colCells)
    } else if (activeTab === 2) {
      const row = Math.floor(index / gridCols)
      const rowCells = []
      for (let col = 0; col < gridCols; col++) {
        rowCells.push(row * gridCols + col)
      }
      toggleCells(rowCells)
    }

    this.setData({ selectedCells: newSelectedCells })
  },

  // ---------- 自由模式：拖动单条分割线 ----------
  onDividerTouchStart(e) {
    if (this.data.modeType !== 'free') return
    const type = e.currentTarget.dataset.type
    const index = Number(e.currentTarget.dataset.index)
    const isCol = type === 'col'
    this._dragDivider = {
      type,
      index,
      startClientX: e.touches[0].clientX,
      startClientY: e.touches[0].clientY,
      startFractions: [...(isCol ? this.data.colFractions : this.data.rowFractions)]
    }
  },

  onDividerTouchMove(e) {
    if (!this._dragDivider) return
    const { type, index, startClientX, startClientY, startFractions } = this._dragDivider
    const isCol = type === 'col'
    const totalSize = isCol
      ? (this._displaySize && this._displaySize.width) || 0
      : (this._displaySize && this._displaySize.height) || 0
    if (!totalSize) return

    const delta = isCol
      ? e.touches[0].clientX - startClientX
      : e.touches[0].clientY - startClientY
    const deltaFraction = delta / totalSize

    const f1 = startFractions[index] + deltaFraction
    const f2 = startFractions[index + 1] - deltaFraction

    // 单格最小占比 5%，避免一格被压扁
    const minFraction = 0.05
    if (f1 < minFraction || f2 < minFraction) return

    const newFractions = [...startFractions]
    newFractions[index] = f1
    newFractions[index + 1] = f2

    if (isCol) {
      this.setData({
        colFractions: newFractions,
        colDividers: this.computeDividers(newFractions)
      })
    } else {
      this.setData({
        rowFractions: newFractions,
        rowDividers: this.computeDividers(newFractions)
      })
    }
    this.applyFrameStyle()
  },

  onDividerTouchEnd() {
    this._dragDivider = null
  },

  // ---------- 固定模式：整体拖动网格 ----------
  onFrameTouchStart(e) {
    if (this.data.modeType !== 'fixed') return
    this._dragFrame = {
      startClientX: e.touches[0].clientX,
      startClientY: e.touches[0].clientY,
      startOffsetX: this.data.fixedOffsetX,
      startOffsetY: this.data.fixedOffsetY,
      moved: false
    }
  },

  onFrameTouchMove(e) {
    if (this.data.modeType !== 'fixed' || !this._dragFrame) return
    if (!this._displaySize) return

    const { width, height } = this._displaySize
    const { fixedGridW, fixedGridH } = this.data
    const dx = e.touches[0].clientX - this._dragFrame.startClientX
    const dy = e.touches[0].clientY - this._dragFrame.startClientY

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      this._dragFrame.moved = true
    }
    if (!this._dragFrame.moved) return

    let newX = this._dragFrame.startOffsetX + dx
    let newY = this._dragFrame.startOffsetY + dy
    newX = Math.max(0, Math.min(width - fixedGridW, newX))
    newY = Math.max(0, Math.min(height - fixedGridH, newY))

    this.setData({
      fixedOffsetX: newX,
      fixedOffsetY: newY
    })
    this.applyFrameStyle()
  },

  onFrameTouchEnd() {
    this._dragFrame = null
  },

  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return
        this.setImageFromPath(file.tempFilePath)
      },
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({ title: '选择图片失败', icon: 'none' })
        }
      }
    })
  },

  onBack() {
    wx.navigateBack()
  }
})
