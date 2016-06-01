
		(function() {
			var mines = {
				".htm": "text/html",
				".html":"text/html",
				".ico" : "image/x-icon",
				".css" : "text/css",
				".gif" : "image/gif",
				".jpeg": "image/jpeg",
				".jpg" : "image/jpeg",
				".js"  : "text/javascript",
				".json": "application/json",
				".pdf" : "application/pdf",
				".png" : "image/png",
				".svg" : "image/svg+xml",
				".swf" : "application/x-shockwave-flash",
				".tiff": "image/tiff",
				".txt" : "text/plain",
				".wav" : "audio/x-wav",
				".wma" : "audio/x-ms-wma",
				".wmv" : "video/x-ms-wmv",
				".xml" : "text/xml"
			};
			this.getFileType = function(type) {
				return mines[type];
			}
		}).call(module.exports);
	