Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    functions: [
      {
        id: 1,
        name: '九宫格切图',
        desc: '制作九宫格、爱心、星星等形状图片'
      },
      {
        id: 2,
        name: '自由切图',
        desc: '表情包分割、UI图分割'
      },
      {
        id: 3,
        name: '自由拼图',
        desc: '多张图片拼接'
      }
    ]
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
  },

  onTapFunction(e) {
    const id = e.currentTarget.dataset.id
    if (id === 1) {
      wx.navigateTo({
        url: '/pages/cut9/cut9'
      })
    } else if (id === 2) {
      // 自由切图：先选择图片
      this.chooseImageForFreeCut()
    } else if (id === 3) {
      wx.navigateTo({
        url: '/pages/freePuzzle/freePuzzle'
      })
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }
  },

  chooseImageForFreeCut() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        wx.navigateTo({
          url: `/pages/freeCut/freeCut?image=${encodeURIComponent(tempFilePath)}`
        })
      },
      fail: () => {
        console.log('用户取消选择图片')
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '九宫格切图X - 一键九宫格 / 自由分割',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: '九宫格切图X - 一键九宫格 / 自由分割'
    }
  }
})
