Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    functions: [
      {
        id: 1,
        name: '切九图',
        desc: '将图片切成九宫格'
      },
      {
        id: 2,
        name: '自由切图',
        desc: '多张图片拼成长图'
      },
      {
        id: 3,
        name: '自由切图',
        desc: '自定义分割方式'
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
      wx.navigateTo({
        url: '/pages/freeCut/freeCut'
      })
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }
  }
})
