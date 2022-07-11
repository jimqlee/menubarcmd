const { app, Tray, Menu, shell, Notification, crashReporter } = require('electron');
const shelljs = require('shelljs')
const fs = require('fs')
const path = require('path')
const executor = require('child_process').exec;


// 获取用户目录
const CONFIG_PATH = app.getPath('userData') 
// 配置文件
const CONFIG_FILE = CONFIG_PATH + "/menucmd.json"

let tray = null;

// 崩溃日志
app.setPath('crashDumps', CONFIG_PATH + '/crash.log')
crashReporter.start({uploadToServer: false})

shelljs.config.execPath = String(shelljs.which('node'))

// 应用单例
const allowToInitiate = app.requestSingleInstanceLock({})
if (!allowToInitiate) {
  app.quit()
}

app.whenReady().then(() => {
  if (app.dock) app.dock.hide();

  tray = new Tray(path.join(__dirname, '../assets/icon_16x16.png'))
  tray.setToolTip('MenubarCMD')

  if (process.platform === 'win32') {
    tray.on('click', tray.popUpContextMenu);
  }
  // 左右键单击一致
  tray.on('right-click', function() {
    tray.click()
  })

  // 检查配置文件
  checkConfigFile()
  // 菜单栏详情
  updateMenu()
})

const updateMenu = () => {
  // 异步从配置文件中读取配置
  fs.readFile(CONFIG_FILE, 'utf-8', function(err, data) {
    if (err) throw err;
    let apps = JSON.parse(data).apps
    let menu = Menu.buildFromTemplate([
      {
        label: '打开配置文件',
        click() { shell.showItemInFolder(CONFIG_FILE) },
        accelerator: 'Command+E'
      },
      { type: 'separator' },
      ...apps.slice(0,10).map(createClippingMenuItem),
      { type: 'separator' },
      {
        label: '更新',
        click() { updateMenu(); showNotification('', '更新完成') },
        accelerator: 'Command+U'
      },
      {
        label: '退出',
        click() { app.quit(); },
        accelerator: 'Command+Q'
      }
    ]);
  
    tray.setContextMenu(menu);
  })
};

const createClippingMenuItem = (app, index) => {
  let cmd = app.cmd
  var submenus = []
  
  for (const c in cmd) {
    if (Object.hasOwnProperty.call(cmd, c)) {
      const element = cmd[c];
      const submenu = {
        label: c,
        click: function() {
          runCommand(app.name, c, element)
        }
      }
      submenus.push(submenu)
    }
  }

  return {
    label: app.name,
    submenu: submenus
  };
};

const showNotification = function(title, message) {
  const notification = new Notification({
    title: title,
    subtitle: null,
    body: message,
    hasReply: false,
    closeButtonText: '关闭'
  })
  notification.show()
}

const DEMO = {
  "apps": [
      {
          "name": "demo",
          "cmd": {
              "start": "shell script to start demo service",
              "stop": "shell script to stop demo service",
              "log": "shell script to open log file",
              "description": "use fullpath of executable file"
          }
      }
]}
const checkConfigFile = function() {
  try {
    // 使用同步判断配置文件是否存在
    fs.accessSync(CONFIG_FILE, fs.F_OK)
  } catch(err) {
    // 创建 demo 配置文件
    shelljs.touch(CONFIG_FILE)
    // 同步写入 demo
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEMO), function(err) {
      if (err) throw err
    })
  }
}

const runCommand = function(appName, cmdName, cmd) {
  exec_process = executor(cmd, {})
  
  exec_process.stdout.on('data', function(data) {
    showNotification(appName + ' - ' + cmdName, data)
  })
  exec_process.stderr.on('data', function(data) {
    showNotification(appName + ' - ' + cmdName, '执行失败: ' + data)
  })
  exec_process.on('close', function(code) {
    if (code == 0) {
      showNotification(appName + ' - ' + cmdName, '执行成功')
    } else {
      showNotification(appName + ' - ' + cmdName, '执行失败, 请检查命令配置')
    }
  })
}