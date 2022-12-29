module.exports = class Util{
    constructor(){
        this.console = console;
    }

    disableConsole(){
        console = {
            log: function(){},
            error: function(){},
            info: function(){},
            warn: function(){}
        }
    }

    enableConsole(){
        console = this.console;
    }
}