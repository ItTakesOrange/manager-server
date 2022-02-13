const router = require('koa-router')()
const Menu = require('../models/menuSchema')
const util = require('../utils/util')

router.prefix('/menu')

// 菜单列表查询
router.get('/list', async (ctx) => {
  const { menuName, menuState } = ctx.request.query
  const params = {}
  if (menuName) params.menuName = menuName
  if (menuState) params.menuState = menuState
  const rootList = await Menu.find(params) || []
  const permissionList = getTreeMenu(rootList, null, [])
  ctx.body = util.success(permissionList, '成功')
})

function getTreeMenu(rootList, id, list) {
  for(let i = 0; i < rootList.length; i++) {
    const item = rootList[i]
    if (String(item.parentId.slice().pop()) === String(id)) {
      list.push(item._doc)
    }
  }
  list.forEach(item => {
    item.children = []
    getTreeMenu(rootList, item._id, item.children)
    if (item.children.length === 0) {
      delete item.children
    } else if (item.children.length > 0 && item.children[0].menuType === 2) {
      // 快速区分菜单和按钮，用于后期做菜单按钮权限控制
      item.action = item.children
    }
  })
  return list
}

// 菜单编辑、删除、新增功能
router.post('/operate', async (ctx) => {
  const { _id, action, ...params } = ctx.request.body
  try {
    let info = ''
    if (action === 'add') {
      await Menu.create(params)
      info = '创建成功'
    } else if (action === 'edit') {
      await Menu.findByIdAndUpdate(_id, params)
      info = '编辑成功'
    } else {
      await Menu.findByIdAndDelete(_id)
      await Menu.deleteMany({ parentId: { $all: [_id] } })
      info = '删除成功'
    }
    ctx.body = util.success('', info)
  } catch (error) {
    ctx.body = util.fail(error.stack)
  }
})

module.exports = router
