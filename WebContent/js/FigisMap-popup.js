/**
 * FigisMap.rnd.configurePopup
 * An experimental function to configure a popup. At now the popup can be configured
 * on a featured layer. It may be extended to other supports (map, getfeatureinfo)
 * 
 * The config may have the following parameters
 * -> urlHandler the url of a web-resource to load asynchronously
 * -> contentHandler a function with the following arguments:
 * 		- feature: the GIS feature from which to extract property values
 * 		- response: the response of the asynchronous call (if urlHandler provided)
 * 
 * @param {ol.Map}
 * @param config
 */
FigisMap.rnd.configurePopup = function(map, config) {

	if( !config.contentHandler ) alert("Missing popup config 'contentHandler'");
	
	var async = !!config.resourceHandler;
	
	//configure popup
	var popup = new ol.Overlay.Popup();
	popup.config = config;
	map.addOverlay(popup);
	
	//display popup on click
	map.on('click', function(evt) {
	  var feature = map.forEachFeatureAtPixel(evt.pixel,
		  function(feature, layer) {
			var features = feature.get('features');
			if( !!features ) {
				var size = features.length;
				if( size > 1 ) {
					return;
				} else {
					feature = features[0];
				}
			}
			return feature;
		  });
	  
	  if (feature) FigisMap.rnd.showPopupForFeature(popup, feature);
	  
	});
}

/**
* Get (first) popup overlay from current map
*/
FigisMap.rnd.getPopupOverlay = function(map) {
	var popup;
	map.getOverlays().getArray().forEach(function(x){ if ( x instanceof ol.Overlay.Popup ) popup = x; });
	return popup;
}

/**
 * Show Popup for a feature
 * @param {ol.Overlay.Popup} the target popup overlay
 * @param {ol.Feature} the feature for which the popup should be opened
 */
FigisMap.rnd.showPopupForFeature = function(popup, feature) {
	
	var async = !!popup.config.resourceHandler;
	
	var geometry = feature.getGeometry();
	var coord = geometry.getCoordinates();
		
	if( async ) {
		
		var xmlHttp = FigisMap.getXMLHttpRequest();
		xmlHttp.onreadystatechange = function() {
			if ( xmlHttp.readyState != 4 ) return void(0);
			if (xmlHttp.status == 200) {
				FigisMap.debug('FigisMap.rnd.popup - async request: ', xmlHttp);
				popup.show(coord, popup.config.contentHandler(feature, xmlHttp));
			}
		};
		xmlHttp.open('GET', popup.config.resourceHandler(feature), true);
		xmlHttp.send('');
	} else {
		popup.show(coord, popup.config.contentHandler(feature, null));
	}

}