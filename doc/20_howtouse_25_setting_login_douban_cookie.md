---
title: Cookie登录Douban
nav_order: 350
parent: 如何使用
---
# 登录方式
Obsidian-Douban插件提供了二维码登录、网页登录和Cookie登录。桌面端与移动端均推荐直接使用二维码登录；桌面端还保留了网页登录作为备用。
## 扫码登录
扫码登录是Obsidian-Douban插件的默认登录方式，适用于大多数用户。扫码登录的步骤如下：
1. 在Obsidian-Douban插件设置中点击`二维码登录`
2. 弹出二维码登录窗口
3. 使用手机或其他设备的豆瓣APP 扫描二维码
4. 在手机上确认登录
5. 登录成功后，Obsidian-Douban插件会自动获取您的豆瓣账号信息

如果直接二维码登录不可用，桌面端可以点击`网页登录`，在独立登录窗口中扫码或输入账号信息。
## 移动端二维码登录
移动端二维码登录适用于iPad、Android平板、iPhone和Android手机，需要使用另一台安装了豆瓣App的设备扫码。

1. 打开Obsidian-Douban插件设置中的“登录”页签
2. 点击`二维码登录`
3. 使用另一台设备打开豆瓣App并扫描二维码
4. 在豆瓣App中确认登录
5. 插件验证成功后会自动关闭二维码窗口并显示豆瓣账号信息

如果只有一台移动设备且无法从相册识别二维码，请使用Cookie登录或同步其他设备的插件配置。
## Cookie登录Douban
此方式适用于移动端，以及桌面端扫码登录失败的用户。
### 操作
1. 打开浏览器(此处默认为您使用的浏览器为Chrome或Chromium衍生浏览器)
2. 访问[豆瓣网站](https://www.douban.com/)
3. 在豆瓣网站中 登录豆瓣
4. 再次访问`https://douban.com`
5. 打开浏览器开发者工具(按键 ctrl + shift +i 或者 F12 或者 右键选择 检查)
6. 选择开发者工具中的`网络`(Network)页签
7. 在出现的页签中选择`全部`(All)
8. 在出现的列表中网上翻找到最上面一条`www.douban.com`, 并点击
9. 点击后出现的`请求头`(Headers) 栏目，找到`请求头`(Request Headers)
10. 找到请求头中的Cookie，选中并复制右边的值  
![](./img/obsidian-douban-setting-cookie.png)
11. 然后回到Obsidian-Douban插件设置中，点击Cookie登录
12. 将浏览器中复制的Cookie值粘贴到弹窗中的输入框中
13. 点击确认
