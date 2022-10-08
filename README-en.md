# MenubarCMD

> Aggregate executable commands in the menubar, then run them through one click

[中文文档](./README.md)


## Example

<img src="doc/en.jpg" alt="snap_1" style="zoom: 67%;" />



## Usage

1. Open the Finder(Cmd+E), and open the `menucmd.json` file with json-editor

   ```json
   {
       "locale": "Display language, currently support zh-CN, en-US",
       "apps": [{
           "name": "Your application name, like MySQL, Kafka",
           "cmd": {
               "Name to describe the command, like start, stop": "Command to execute, mind if your command should run with special shell"
           }
       }]
   }
   ```

2. Save the config file and reload(Cmd+R)
3. Run 
   - Single click to run the command
   - Single click while pressing `Option` to copy the command to the system clipboard
   - Single click while pressing `Shift` to run the command & copy the command to the system clipboard



## Build

```shell
# Download dependencies
npm install
# run
npm run start
# build dmg file
npm run build
```



