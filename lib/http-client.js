var
	util = require("util"),
	http = require("http"),
	querystring = require("querystring"),
	locals = null,
	options = null,
	cservice = require("../cluster-service")
;

exports.init = function(l, o) {
	locals = l;
	options = o;

	cservice.log("Service already running. Attached CLI to master service. Enter 'help [enter]' for help.".info);

	if (!options || options.silentMode !== true) {
	    process.stdin.resume();
	    process.stdin.setEncoding('utf8');
	    process.stdin.on("data", onCommand);
	    process.stdout.write("cservice> ".cservice);
	}
};

exports.execute = onCommand;

function onCommand(question, cb) {
    question = question.replace(/[\r\n]/g, "");
    var split = question.split(" ");
	if (split[0] === "exit") {
		cservice.log("Exiting CLI ONLY.".yellow);
		process.kill(process.pid, "SIGKILL"); // exit by force
		return;
	}
	var qs = querystring.stringify({
		cmd: question,
		accessKey: options.accessKey
	});
	var url = "http://" + (options.host || "localhost") + ":" + (options.port || 11987) + "/cli"
		+ "?" + qs
	;
	cservice.log("Running remote command: ".warn + url.replace(/accessKey=.*/i, "accessKey={ACCESS_KEY}").data);
    var body = "", err;
    http.request(
        {
            host: options.host || "localhost",
            port: options.port || 11987,
            path: "/cli?" + qs,
            method: "POST"
        }, function(res) {
            res.setEncoding('utf8');
            res.on("data", function(chunk) {
                body += chunk;
            });
            res.on("end", function() {
        	    if (res.statusCode !== 200 && body) {
                    err = body;
                }
                onCallback(err, body, res, cb);
            });
        }
    ).on("error", function(err) {
        body = err;
        onCallback(err, body, null, cb);
    }).end();
}

function onCallback(err, result, res, cb) {
	if (err) {
	    cservice.error("Error: ", err);
	    result = { statusCode: res ? res.statusCode : "unknown", error: err };
    } else if (result) {
		if (typeof result === "string" && (result.indexOf("{") === 0 || result.indexOf("[") === 0)) {
			result = JSON.parse(result); // deserialize
		}
	}
	cservice.log(util.inspect(result, { depth: null, colors: true }));

	if (!options || options.silentMode !== true) {
		//cservice.log("");//newline
	    process.stdout.write("cservice> ".cservice);
	}
	
	cb && cb(err, result);
}
