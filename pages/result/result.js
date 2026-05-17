Page({
  data: {
    previewList: [],
    statusBarHeight: 0,
    navBarHeight: 0,
    // 'grid' = 来自九宫格切图（一行 3 个）；'free' = 自由切图（一行 4 个）；'puzzle' = 自由拼图（单图）
    source: '',
    gridColumns: 4,
    // 预览区标题：拼图来源显示「拼图效果图」，其余显示「下载顺序」
    previewTitle: '下载顺序',
    // 三个继续操作按钮的文案，根据 source 动态加上「继续」前缀
    gridLabel: '九宫格',
    collageLabel: '自由切图',
    puzzleLabel: '自由拼图'
  },

  onLoad(options) {
    const systemInfo = wx.getSystemInfoSync()
    const statusBarHeight = systemInfo.statusBarHeight || 20
    const menuButton = wx.getMenuButtonBoundingClientRect()
    const navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height
    this.setData({ statusBarHeight, navBarHeight })

    const source = options.source || ''
    let gridColumns = 4
    if (source === 'grid') gridColumns = 3
    else if (source === 'puzzle') gridColumns = 1

    const previewTitle = source === 'puzzle' ? '拼图效果图' : '下载顺序'
    const gridLabel = source === 'grid' ? '继续九宫格' : '九宫格'
    const collageLabel = source === 'free' ? '继续自由切图' : '自由切图'
    const puzzleLabel = source === 'puzzle' ? '继续自由拼图' : '自由拼图'

    this.setData({
      source,
      gridColumns,
      previewTitle,
      gridLabel,
      collageLabel,
      puzzleLabel
    })

    if (options.images) {
      try {
        const images = JSON.parse(decodeURIComponent(options.images))
        this.setData({ previewList: images })
      } catch (e) {
        console.error('解析图片列表失败', e)
      }
    }
  },

  onBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  },

  onActionTap(e) {
    const action = e.currentTarget.dataset.action
    switch (action) {
      case 'grid':
        wx.redirectTo({ url: '/pages/cut9/cut9' })
        break
      case 'collage':
        this.chooseImageForFreeCut()
        break
      case 'puzzle':
        wx.redirectTo({ url: '/pages/freePuzzle/freePuzzle' })
        break
    }
  },

  chooseImageForFreeCut() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        wx.redirectTo({
          url: `/pages/freeCut/freeCut?image=${encodeURIComponent(tempFilePath)}`
        })
      },
      fail: () => {
        console.log('用户取消选择图片')
      }
    })
  },


  onPreviewTap(e) {
    const index = e.currentTarget.dataset.index
    const { previewList } = this.data
    if (previewList.length === 0) return

    wx.previewImage({
      current: previewList[index],
      urls: previewList
    })
  },

  onShareAppMessage() {
    const { previewList } = this.data
    const imageUrl = previewList && previewList.length > 0 ? previewList[previewList.length - 1] : ''
    return {
      title: '看看我切好的图片',
      path: '/pages/index/index',
      imageUrl
    }
  },

  onShareTimeline() {
    const { previewList } = this.data
    const imageUrl = previewList && previewList.length > 0 ? previewList[previewList.length - 1] : ''
    return {
      title: '看看我切好的图片',
      imageUrl
    }
  }
})
