//
// Debug plugin for forever-monitor
//

module.exports = function(extOptions) {
        const options = Object.assign({
            loglevel: 5,
            prefix: "[DBG -%%-]"
        }, extOptions)

        const debug = function() {
            if(options.loglevel < 1) {
                console.log(options.prefix.replace(/%%/,"DEBUG"), ...arguments);
            }
        }
        const log = function() {
            if(options.loglevel < 2) {
                console.log(options.prefix.replace(/%%/,"LOG"), ...arguments);
            }
        }
        const warn = function() {
            if(options.loglevel < 3) {
                console.warn(options.prefix.replace(/%%/,"WARN"), ...arguments);
            }
        }
        const error = function() {
            if(options.loglevel < 4) {
                console.error(options.prefix.replace(/%%/,"ERROR"), ...arguments);
            }
        }

        return {
            debug,
            log,
            warn,
            error
        }
    };
