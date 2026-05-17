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

    colFractions: [],
    rowFractions: [],
    colDividers: [],
    rowDividers: [],

    fixedGridW: 0,
    fixedGridH: 0,
    fixedOffsetX: 0,
    fixedOffsetY: 0,

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

      this._displaySize = { width: displayWidth, height: displayHeight }
      console.log('==================================================')
      console.log('【调试日志】容器宽高:', container.width, container.height)
      console.log('【调试日志】图片显示尺寸 display:', displayWidth, displayHeight)
      console.log('【调试日志】原图真实尺寸 img:', imgWidth, imgHeight)
      console.log('==================================================')

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
      cells.push({ index: i, col, row, isFirstRow: row === 0, isFirstCol: col === 0, isLastCol: col === cols - 1, isLastRow: row === rows - 1 })
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
    this.setData({ gridCells: this.buildCells(gridCols, gridRows), colFractions, rowFractions, colDividers: this.computeDividers(colFractions), rowDividers: this.computeDividers(rowFractions), selectedCells: [] })
    this.recomputeFixedGrid(true)
    this.applyFrameStyle()
  },
  resetLayout() {
    const { gridCols, gridRows } = this.data
    const colFractions = Array(gridCols).fill(1 / gridCols)
    const rowFractions = Array(gridRows).fill(1 / gridRows)
    this.setData({ colFractions, rowFractions, colDividers: this.computeDividers(colFractions), rowDividers: this.computeDividers(rowFractions) })
    this.recomputeFixedGrid(true)
    this.applyFrameStyle()
  },
  recomputeFixedGrid(recenter) {
    if (!this._displaySize) return
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
    this.setData({ fixedGridW, fixedGridH, fixedOffsetX: offsetX, fixedOffsetY: offsetY })
  },
  applyFrameStyle() {
    const { modeType, gridCols, gridRows, colFractions, rowFractions, fixedOffsetX, fixedOffsetY, fixedGridW, fixedGridH } = this.data
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
    this.setData({ activeTab: index, activeGridIndex: 0, gridCols: grid.cols, gridRows: grid.rows, gridCells: this.buildCells(grid.cols, grid.rows), selectedCells: [] })
    this.resetLayout()
  },
  onModeChange(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.modeType) return
    this.setData({ modeType: type })
    if (type === 'fixed') this.recomputeFixedGrid(true)
    this.applyFrameStyle()
  },
  onGridSelect(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10)
    const currentList = this.getCurrentList(this.activeTab)
    const grid = currentList[index]
    if (!grid) return
    this.setData({ activeGridIndex: index, gridCols: grid.cols, gridRows: grid.rows, gridCells: this.buildCells(grid.cols, grid.rows), selectedCells: [] })
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
        cells.forEach(c => { const idx = newSelectedCells.indexOf(c); if (idx > -1) newSelectedCells.splice(idx, 1) })
      } else {
        cells.forEach(c => { if (!newSelectedCells.includes(c)) newSelectedCells.push(c) })
      }
    }
    if (activeTab === 0) toggleCells([index])
    else if (activeTab === 1) { const col = index % gridCols; const colCells = []; for (let row = 0; row < gridRows; row++) colCells.push(row * gridCols + col); toggleCells(colCells) }
    else if (activeTab === 2) { const row = Math.floor(index / gridCols); const rowCells = []; for (let col = 0; col < gridCols; col++) rowCells.push(row * gridCols + col); toggleCells(rowCells) }
    this.setData({ selectedCells: newSelectedCells })
  },
  onDividerTouchStart(e) {
    if (this.data.modeType !== 'free') return
    const type = e.currentTarget.dataset.type
    const index = Number(e.currentTarget.dataset.index)
    const isCol = type === 'col'
    this._dragDivider = { type, index, startClientX: e.touches[0].clientX, startClientY: e.touches[0].clientY, startFractions: [...(isCol ? this.data.colFractions : this.data.rowFractions)] }
  },
  onDividerTouchMove(e) {
    if (!this._dragDivider) return
    const { type, index, startClientX, startClientY, startFractions } = this._dragDivider
    const isCol = type === 'col'
    const totalSize = isCol ? (this._displaySize && this._displaySize.width) || 0 : (this._displaySize && this._displaySize.height) || 0
    if (!totalSize) return
    const delta = isCol ? e.touches[0].clientX - startClientX : e.touches[0].clientY - startClientY
    const deltaFraction = delta / totalSize
    const f1 = startFractions[index] + deltaFraction
    const f2 = startFractions[index + 1] - deltaFraction
    const minFraction = 0.05
    if (f1 < minFraction || f2 < minFraction) return
    const newFractions = [...startFractions]
    newFractions[index] = f1
    newFractions[index + 1] = f2
    if (isCol) this.setData({ colFractions: newFractions, colDividers: this.computeDividers(newFractions) })
    else this.setData({ rowFractions: newFractions, rowDividers: this.computeDividers(newFractions) })
    this.applyFrameStyle()
  },
  onDividerTouchEnd() { this._dragDivider = null },
  onFrameTouchStart(e) {
    if (this.data.modeType !== 'fixed') return
    if (e.touches.length >= 2) {
      this._beginPinch(e)
      this._dragFrame = null
      return
    }
    this._pinchFrame = null
    this._dragFrame = { startClientX: e.touches[0].clientX, startClientY: e.touches[0].clientY, startOffsetX: this.data.fixedOffsetX, startOffsetY: this.data.fixedOffsetY, moved: false }
  },
  onFrameTouchMove(e) {
    if (this.data.modeType !== 'fixed') return
    if (!this._displaySize) return

    if (e.touches.length >= 2) {
      if (!this._pinchFrame) this._beginPinch(e)
      this._handlePinch(e)
      return
    }

    if (this._pinchFrame) return

    if (!this._dragFrame) return
    const { width, height } = this._displaySize
    const { fixedGridW, fixedGridH } = this.data
    const dx = e.touches[0].clientX - this._dragFrame.startClientX
    const dy = e.touches[0].clientY - this._dragFrame.startClientY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this._dragFrame.moved = true
    if (!this._dragFrame.moved) return
    let newX = this._dragFrame.startOffsetX + dx
    let newY = this._dragFrame.startOffsetY + dy
    newX = Math.max(0, Math.min(width - fixedGridW, newX))
    newY = Math.max(0, Math.min(height - fixedGridH, newY))
    this.setData({ fixedOffsetX: newX, fixedOffsetY: newY })
    this.applyFrameStyle()
  },
  onFrameTouchEnd(e) {
    if (e && e.touches && e.touches.length >= 2) return
    this._dragFrame = null
    this._pinchFrame = null
  },

  _beginPinch(e) {
    const t1 = e.touches[0]
    const t2 = e.touches[1]
    const dx = t2.clientX - t1.clientX
    const dy = t2.clientY - t1.clientY
    const startDistance = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    this._pinchFrame = {
      startDistance,
      startGridW: this.data.fixedGridW,
      startGridH: this.data.fixedGridH,
      startOffsetX: this.data.fixedOffsetX,
      startOffsetY: this.data.fixedOffsetY
    }
  },

  _handlePinch(e) {
    if (!this._pinchFrame) return
    const { width, height } = this._displaySize
    const { gridCols, gridRows } = this.data
    const { startDistance, startGridW, startGridH, startOffsetX, startOffsetY } = this._pinchFrame

    const t1 = e.touches[0]
    const t2 = e.touches[1]
    const dx = t2.clientX - t1.clientX
    const dy = t2.clientY - t1.clientY
    const currentDistance = Math.max(1, Math.sqrt(dx * dx + dy * dy))

    let scale = currentDistance / startDistance

    const maxScale = Math.min(width / startGridW, height / startGridH)
    const minCellPx = 20
    const startCellW = startGridW / gridCols
    const startCellH = startGridH / gridRows
    const minScale = Math.max(minCellPx / startCellW, minCellPx / startCellH)
    scale = Math.max(minScale, Math.min(maxScale, scale))

    const newGridW = startGridW * scale
    const newGridH = startGridH * scale

    const centerX = startOffsetX + startGridW / 2
    const centerY = startOffsetY + startGridH / 2
    let newX = centerX - newGridW / 2
    let newY = centerY - newGridH / 2
    newX = Math.max(0, Math.min(width - newGridW, newX))
    newY = Math.max(0, Math.min(height - newGridH, newY))

    this.setData({ fixedGridW: newGridW, fixedGridH: newGridH, fixedOffsetX: newX, fixedOffsetY: newY })
    this.applyFrameStyle()
  },
  onChooseImage() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], sizeType: ['original'], sourceType: ['album'], success: (res) => { const file = res.tempFiles[0]; if (!file) return; this.setImageFromPath(file.tempFilePath) } })
  },
  onBack() { wx.navigateBack() },

  async onConfirm() {
    console.log('==================================================')
    console.log('【点击保存】')
    if (!this.data.selectedImage || !this.data.imgWidth) { wx.showToast({ icon: 'none', title: '图片未加载' }); return }
    const cellRects = this.computeCellRects()
    console.log('【最终裁剪区域 原图坐标】', cellRects[0])
    console.log('==================================================')

    try {
      await this.ensureAlbumAuth()
      const previewList = []
      const total = cellRects.length + 1
      for (let i = 0; i < cellRects.length; i++) {
        const r = cellRects[i]
        wx.showLoading({ title: `正在保存 ${i + 1}/${total}`, mask: true })
        const piecePath = await this.cropImageByCanvas(this.data.selectedImage, r.x, r.y, r.w, r.h)
        await this.saveToAlbum(piecePath)
        previewList.push(piecePath)
      }
      wx.showLoading({ title: `正在保存 ${total}/${total}`, mask: true })
      const completePath = await this.renderCompleteImage()
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
    }
  },

  computeCellRects() {
    const { modeType, gridCols, gridRows, imgWidth, imgHeight, fixedGridW, fixedGridH, fixedOffsetX, fixedOffsetY } = this.data
    const rects = []
    if (modeType === 'free') {
      const colXs = []
      let cumX = 0
      for (let i = 0; i < gridCols; i++) { colXs.push(cumX * imgWidth); cumX += this.data.colFractions[i] }
      colXs.push(imgWidth)
      const rowYs = []
      let cumY = 0
      for (let i = 0; i < gridRows; i++) { rowYs.push(cumY * imgHeight); cumY += this.data.rowFractions[i] }
      rowYs.push(imgHeight)
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          rects.push({ x: colXs[col], y: rowYs[row], w: colXs[col + 1] - colXs[col], h: rowYs[row + 1] - rowYs[row] })
        }
      }
    } else {
      const display = this._displaySize
      const scaleW = imgWidth / display.width
      const scaleH = imgHeight / display.height

      console.log('==================================================')
      console.log('【网格视图坐标】', fixedOffsetX, fixedOffsetY, fixedGridW, fixedGridH)
      console.log('【缩放比例】', scaleW, scaleH)

      const x = fixedOffsetX * scaleW
      const y = fixedOffsetY * scaleH
      const w = fixedGridW * scaleW
      const h = fixedGridH * scaleH

      console.log('【映射到原图坐标】', x, y, w, h)
      console.log('==================================================')

      const cellW = w / gridCols
      const cellH = h / gridRows
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          rects.push({ x: x + col * cellW, y: y + row * cellH, w: cellW, h: cellH })
        }
      }
    }
    return rects
  },

  // 绘制完整图：只截取框选区域 + 保留原生黑白虚线分割线，无额外红边框
  renderCompleteImage() {
    return new Promise((resolve, reject) => {
      const { modeType, gridCols, gridRows, imgWidth, imgHeight, fixedGridW, fixedGridH, fixedOffsetX, fixedOffsetY, colFractions, rowFractions } = this.data
      const query = wx.createSelectorQuery().in(this)
      query.select('#freeCutCanvas').fields({ node: true }).exec((res) => {
        if (!res || !res[0]) return reject()
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')

        if (modeType === 'fixed') {
          const display = this._displaySize
          const scaleW = imgWidth / display.width
          const scaleH = imgHeight / display.height
          const cutX = fixedOffsetX * scaleW
          const cutY = fixedOffsetY * scaleH
          const cutW = fixedGridW * scaleW
          const cutH = fixedGridH * scaleH

          // 画布设为框选区域大小
          canvas.width = cutW
          canvas.height = cutH

          const img = canvas.createImage()
          img.onload = () => {
            // 截取框内图片
            ctx.drawImage(img, cutX, cutY, cutW, cutH, 0, 0, cutW, cutH)
            // 绘制和界面一致的黑白交替虚线分割线
            const cellW = cutW / gridCols
            const cellH = cutH / gridRows
            const lineW = Math.max(2, Math.round(Math.min(cutW, cutH) * 0.005))

            // 竖线
            for (let i = 1; i < gridCols; i++) {
              let lx = i * cellW
              this.drawAlternatingLine(ctx, lx, 0, lx, cutH, lineW)
            }
            // 横线
            for (let i = 1; i < gridRows; i++) {
              let ly = i * cellH
              this.drawAlternatingLine(ctx, 0, ly, cutW, ly, lineW)
            }
            // 外框虚线
            this.drawAlternatingLine(ctx, 0, 0, cutW, 0, lineW)
            this.drawAlternatingLine(ctx, 0, cutH, cutW, cutH, lineW)
            this.drawAlternatingLine(ctx, 0, 0, 0, cutH, lineW)
            this.drawAlternatingLine(ctx, cutW, 0, cutW, cutH, lineW)

            wx.canvasToTempFilePath({ canvas, success: r => resolve(r.tempFilePath) })
          }
          img.src = this.data.selectedImage
        } else {
          // 自由模式原样
          canvas.width = imgWidth
          canvas.height = imgHeight
          const img = canvas.createImage()
          img.onload = () => {
            ctx.clearRect(0, 0, imgWidth, imgHeight)
            ctx.drawImage(img, 0, 0, imgWidth, imgHeight)
            const lineWidth = Math.max(2, Math.round(Math.min(imgWidth, imgHeight) * 0.005))
            let cumX = 0
            for (let i = 0; i < gridCols - 1; i++) {
              cumX += colFractions[i]
              const x = cumX * imgWidth
              this.drawAlternatingLine(ctx, x, 0, x, imgHeight, lineWidth)
            }
            let cumY = 0
            for (let i = 0; i < gridRows - 1; i++) {
              cumY += rowFractions[i]
              const y = cumY * imgHeight
              this.drawAlternatingLine(ctx, 0, y, imgWidth, y, lineWidth)
            }
            wx.canvasToTempFilePath({ canvas, success: r => resolve(r.tempFilePath) })
          }
          img.src = this.data.selectedImage
        }
      })
    })
  },

  // 黑白相间虚线绘制方法（和界面预览一致）
  drawAlternatingLine(ctx, x1, y1, x2, y2, lineWidth) {
    const dash = Math.max(4, lineWidth * 4)
    ctx.save()
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'butt'
    ctx.setLineDash([dash, dash])
    ctx.lineDashOffset = 0
    ctx.strokeStyle = '#000000'
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    ctx.setLineDash([dash, dash])
    ctx.lineDashOffset = -dash
    ctx.strokeStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.restore()
  },

  cropImageByCanvas(src, sx, sy, sw, sh) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery().in(this)
      query.select('#freeCutCanvas').fields({ node: true }).exec((res) => {
        if (!res || !res[0]) return reject()
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const w = Math.max(1, Math.round(sw))
        const h = Math.max(1, Math.round(sh))
        canvas.width = w
        canvas.height = h
        const img = canvas.createImage()
        img.onload = () => {
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
          wx.canvasToTempFilePath({ canvas, success: r => resolve(r.tempFilePath) })
        }
        img.src = src
      })
    })
  },

  ensureAlbumAuth() {
    return new Promise(resolve => {
      wx.getSetting({
        success(res) {
          if (res.authSetting['scope.writePhotosAlbum']) resolve()
          else wx.authorize({ scope: 'scope.writePhotosAlbum', success: resolve })
        }
      })
    })
  },

  saveToAlbum(filePath) {
    return new Promise(resolve => {
      wx.saveImageToPhotosAlbum({ filePath, success: resolve })
    })
  }
})