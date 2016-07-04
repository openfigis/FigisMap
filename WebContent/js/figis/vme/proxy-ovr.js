//proxy-ovr configuration
FigisMap.proxy= '/http_proxy/proxy/?url=';

var oldRequest = Ext.lib.Ajax.request;
OpenLayers.ProxyHost = FigisMap.proxy;   
Ext.apply(Ext.lib.Ajax, {
	/** private: method[request]
	 */
	request: function(method, uri, cb, data, options) { 
		//console.log(method);
		//console.log(uri);
		//console.log(cb);
		//console.log(data);
		//console.log(options);                                   
		var sameOrigin = !(uri.indexOf("http") == 0);
		var urlParts = !sameOrigin && uri.match(/([^:]*:)\/\/([^:]*:?[^@]*@)?([^:\/\?]*):?([^\/\?]*)/);
		if (urlParts) {
			var location = window.location;
			sameOrigin =
				urlParts[1] == location.protocol &&
				urlParts[3] == location.hostname;
			var uPort = urlParts[4], lPort = location.port;
			if (uPort != 80 && uPort != "" || lPort != "80" && lPort != "") {
				sameOrigin = sameOrigin && uPort == lPort;
			}
		}
		if (!sameOrigin) {
			//if (config.proxyUrl) {        
				var proxyUrl = FigisMap.proxy;
				if(proxyUrl.match(/^http:\/\//i) === null) {
					proxyUrl = 'http://' + window.location.host + proxyUrl;
				}
				if(data){
					uri = proxyUrl +encodeURIComponent(uri+'?'+data);
				}else{
					uri = proxyUrl +encodeURIComponent(uri);
				}
			//} else {
			//    console.warn('Proxy needed');
			//}                
		}
		
		oldRequest.call(this, method, uri, cb, data, options);
				   
	}        
}); 