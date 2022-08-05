const {dialog} = require ('electron').remote
window.onload = function() {
    const btn = document.getElementById('chooseConfigBtn')
    btn.addEventListener('click', function() {
        dialog.showOpenDialog({
            title: '选择配置文件', // 对话框的标题
            // defaultPath: 'xiaojiejie.jpg', // 默认的文件名字
            filters: [{
                extensions: ['json'] // 只允许 jpg 和 png 格式的文件
            }],
            buttonLabel: '确认' // 自定义按钮文本显示内容
        }).then((res) => {
            // 选择文件之后的处理
            console.log(res)
            if (!res.canceled) { // 如果不是点击的 取消按钮
                const myImage = document.querySelector('#config_file_text')
                myImage.nodeValue = res.filePaths[0] // 图片显示在界面中（文件可以多选）
            } else {
                alert('你选择了取消按钮')
            }
        }).catch((err) => {
            // 选择文件出错的处理
            console.log(err)
        })
    })
}