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
 * @param map
 * @param config
 */
FigisMap.rnd.configurePopup = function(map, config) {

	if( !config.contentHandler ) alert("Missing popup config 'contentHandler'");
	
	var async = !!config.resourceHandler;
	
	//configure popup
	var popup = new ol.Overlay.Popup();
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
	  
	  if (feature) {
		var geometry = feature.getGeometry();
		var coord = geometry.getCoordinates();
		
		if( async ) {
			
			var xmlHttp = FigisMap.getXMLHttpRequest();
			xmlHttp.onreadystatechange = function() {
				if ( xmlHttp.readyState != 4 ) return void(0);
				if (xmlHttp.status == 200) {
					FigisMap.debug('FigisMap.rnd.popup - async request: ', xmlHttp);
					popup.show(evt.coordinate, config.contentHandler(feature, xmlHttp));
				}
			};
			xmlHttp.open('GET', config.resourceHandler(feature), true);
			xmlHttp.send('');
		} else {
			popup.show(evt.coordinate, config.contentHandler(feature, null));
		}
	  }
	});
}