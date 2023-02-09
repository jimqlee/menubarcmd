const { app, Tray, Menu, shell, Notification, crashReporter, clipboard, globalShortcut } = require('electron');
const shelljs = require('shelljs')
const fs = require('fs')
const path = require('path')
const executor = require('child_process').exec;
const {I18n} = require('i18n')
const customI18n = require('./i18n')

// app data path
const CONFIG_PATH = app.getPath('userData') 
// config file
const CONFIG_FILE = CONFIG_PATH + "/menucmd.json"

// tray
let tray = null;

// locales
let locales = customI18n.getSupportedLocales();
// current language
let lang = {}

// crash report 
app.setPath('crashDumps', CONFIG_PATH + '/crash.log')
crashReporter.start({uploadToServer: false})

// setup node env
shelljs.config.execPath = String(shelljs.which('node'))

// app singleton
const allowToInitiate = app.requestSingleInstanceLock({})
if (!allowToInitiate) {
  app.quit()
}

if (app.isPackaged) {
  // launch at startup, and hide it
  app.setLoginItemSettings({openAtLogin: true, openAsHidden: true})
}

// internationalize
let i18n = new I18n({
  updateFiles: true,
  locales: locales,
  directory: path.join(__dirname, '../locales'),
  register: lang
})


/**
 * app ready
 */
app.whenReady().then(() => {
  if (app.dock) app.dock.hide();

  tray = new Tray(path.join(__dirname, '../assets/icon_16x16.png'))
  tray.setToolTip('MenubarCMD')

  if (process.platform === 'win32') {
    tray.on('click', tray.popUpContextMenu);
  }

  // right click acts like click
  tray.on('right-click', function() {
    tray.click()  
  })

  // check config file
  checkConfigFile()
  // create tray menu
  updateMenu()

  globalShortcut.register('Command+Shift+M', function () {
    tray.popUpContextMenu()
  })
})

app.on('window-all-closed', () => {
  // intercept here otherwise app will quit after all windows closed
})

app.on('will-quit', function() {
  globalShortcut.unregisterAll()
})

/**
 * update menu and submenu
 */
const updateMenu = () => {
  // async read config file
  fs.readFile(CONFIG_FILE, 'utf-8', function(err, data) {
    if (err) throw err;
    
    let config = JSON.parse(data)
    i18n.setLocale(lang, config.locale)

    let menu = Menu.buildFromTemplate([
      {
        label: lang.__('locateConfigFile'),
        click() { shell.showItemInFolder(CONFIG_FILE) },
        accelerator: 'Command+E'
      },
      { type: 'separator' },
        ...config.apps.map(createMenuItem),
      { type: 'separator' },
      {
        label: lang.__('reloadConfigFile'),
        click() { updateMenu(); showNotification('', lang.__('reloadFinish')) },
        accelerator: 'Command+R'
      },
      {
        label: lang.__('language'),
        submenu: createLocaleMenuItem(config)
      },
      {
        label: lang.__('quit'),
        click() { app.quit(); },
        accelerator: 'Command+Q'
      }
    ]);
  
    tray.setContextMenu(menu);
  })
};

/**
 * create menu item
 * 
 * @param {*} app 
 * @param {*} index 
 * @returns 
 */
const createMenuItem = (app, index) => {
  let cmd = app.cmd
  var submenus = []
  
  for (const c in cmd) {
    if (Object.hasOwnProperty.call(cmd, c)) {
      const element = cmd[c];
      const submenu = {
        label: c,
        click: function(ref, bounds, event) {
          // event: ctrlKey, metaKey(macOS command), shiftKey, altKey(windows alt, macOS option), triggeredByAccelerator
          
          // if triggered with shift, copy command to system clipboard and then run it
          if (event.shiftKey) {
            copyAndRunCommand(app.name, c, element)
          } 
          // if triggered with alt/option, copy command to system clipboard
          else if (event.altKey) {
            copyCommand(app.name, c, element)
          } 
          // run command immediately
          else {
            runCommand(app.name, c, element)
          }
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

/**
 * create i18n menu item
 * 
 * @returns 
 */
const createLocaleMenuItem = function(config) {
  var localeMenuItem = []
  for(const lo in locales) {
    localeMenuItem.push({
      label: customI18n.getLocaleLang(locales[lo]),
      click: function() {
        updateLocale(config, locales[lo])
        updateMenu()
      },
      type: "radio",
      checked: isLocaleChecked(config, locales[lo])
    })
  }

  return localeMenuItem
};

/**
 * 
 * 
 * @param {*} config 
 * @param {*} current 
 * @returns 
 */
const isLocaleChecked = function(config, current) {
  if (config.locale == current) {
    return true;
  }
  return false;
}

/**
 * show notification
 * 
 * @param {*} title 
 * @param {*} message 
 */
const showNotification = function(title, message) {
  const notification = new Notification({
    title: title,
    subtitle: null,
    body: message,
    hasReply: false,
    closeButtonText: lang.__('close')
  })
  notification.show()
}

const DEMO = {
  "locale": "zh-CN",
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

/**
 * check config file, will create it if not exists
 */
const checkConfigFile = function() {
  try {
    // sync-check if config file exists
    fs.accessSync(CONFIG_FILE, fs.F_OK)
  } catch(err) {
    // create demo config file
    shelljs.touch(CONFIG_FILE)
    // write into file
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEMO, null, 4), function(err) {
      if (err) throw err
    })
  }
}

/**
 * update selected locale: update config file and refresh menu
 * 
 * @param {*} config 
 * @param {*} locale 
 */
const updateLocale = function(config, locale) {
  i18n.setLocale(lang, locale)
  config['locale'] = locale
  writeConfigFile(JSON.stringify(config, null, 4))
}

/**
 * write config file
 * 
 * @param {*} data 
 */
const writeConfigFile = function(data) {
  fs.writeFileSync(CONFIG_FILE, data, function(err) {
    if (err) {
      showNotification(lang.__('updateConfigFileFail'), err)
    }
  })
}

/**
 * run the selected command
 * 
 * @param {*} appName 
 * @param {*} cmdName 
 * @param {*} cmd 
 */
const runCommand = function(appName, cmdName, cmd) {
  exec_process = executor(cmd, {})
  
  exec_process.stdout.on('data', function(data) {
    showNotification(appName + ' - ' + cmdName, data)
  })
  exec_process.stderr.on('data', function(data) {
    showNotification(appName + ' - ' + cmdName, lang.__('executeFail') + ': ' + data)
  })
  exec_process.on('close', function(code) {
    if (code !== 0) {
      showNotification(appName + ' - ' + cmdName, lang.__('executeFailAndCheck'))
    } else {
      showNotification(appName + ' - ' + cmdName, lang.__('executeSucc'))
    }
  })
}

const copyCommand = function(appName, cmdName, cmd) {
  clipboard.writeText(cmd)
  showNotification(appName + ' - ' + cmdName, lang.__('copied'))
}

const copyAndRunCommand = function(appName, cmdName, cmd) {
  copyCommand(appName, cmdName, cmd)
  runCommand(appName, cmdName, cmd)
}