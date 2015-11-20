/**
 * FigisMap.rnd.configurePopup
 * An function to configure a popup. At now the popup can be configured on a featured layer. 
 * It may be extended to other supports (map, getfeatureinfo)
 * 
 * The config may have the following parameters
 * -> urlHandler the url of a web-resource to load asynchronously
 * -> contentHandler a function with the following arguments:
 * 		- feature: the GIS feature from which to extract property values
 * 		- response: the response of the asynchronous call (if urlHandler provided)
 * -> onopen a function (with feature argument) to do some stuff when the popup is opened
 * -> onclose a function (with feature argument) to do some stuff when the popup is closed
 * 
 * @param {ol.Map} the current map
 * @param {String}{Integer} an identifier for the popup
 * @param config
 */
FigisMap.rnd.configurePopup = function(map, id, config) {

	if( !config.contentHandler ) alert("Missing popup config 'contentHandler'");
	
	//configure popup
	var popup = new ol.Overlay.Popup({id: id});
	popup.config = config;
	map.addOverlay(popup);
	
	//display popup on click
	map.on('click', function(evt) {
	  var feature = map.forEachFeatureAtPixel(evt.pixel,
		  function(feature, layer) {
						
			if (layer) if(layer.id != id) return;

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
		var coords = feature.getGeometry().getCoordinates();
		FigisMap.rnd.showPopupForCoordinates(popup, feature, coords);
	  }	
	});
	
	//close event
	if( config.onclose) popup.closer.addEventListener("click", config.onclose);

}

/**
 * Get (first) popup overlay from current map
 * @param {ol.Map} the current map
 * @param {String}{Integer} the popup id
 */
FigisMap.rnd.getPopupOverlay = function(map, id) {
	return map.getOverlayById(id);
}

/**
 * Show Popup for a feature
 * @param {ol.Overlay.Popup} the target popup overlay
 * @param {ol.Feature} the feature to be used for resource and content handling
 * @param {ol.Coordinate} the coordinates where the popup should be opened
 */
FigisMap.rnd.showPopupForCoordinates = function(popup, feature, coords) {

	var async = !!popup.config.resourceHandler;
	
	if( async ) {
		
		var xmlHttp = FigisMap.getXMLHttpRequest();
		xmlHttp.onreadystatechange = function() {
			if ( xmlHttp.readyState != 4 ) return void(0);
			if (xmlHttp.status == 200) {
				FigisMap.debug('FigisMap.rnd.popup - async request: ', xmlHttp);
				popup.show(coords, popup.config.contentHandler(feature, xmlHttp));
				if( popup.config.onopen) popup.config.onopen(feature);
			}
		};
		xmlHttp.open('GET', popup.config.resourceHandler(feature), true);
		xmlHttp.send('');
	} else {
		popup.show(coords, popup.config.contentHandler(feature, null));
		if( popup.config.onopen) popup.config.onopen(feature);	
	}
}


/**
 * FigisMap.rnd.configureTooltipPopup
 * An function to configure a tooltip popup.
 * 
 * The config may have the following parameters
 * -> tooltipHandler a function with the following arguments:
 * 		- feature: the GIS feature from which to extract property values
 * 
 * @param {ol.Map} the current map
 * @param {String}{Integer} an identifier for the popup
 * @param config
 */
FigisMap.rnd.configureTooltipPopup = function(map, id, config) {

	if( !!config.tooltipHandler ) {
	
		//configure popup
		var popup = new ol.Overlay.Popup({isTooltip: true});
		popup.config = config;
		map.addOverlay(popup);
	
		//display popup on click
		map.on('pointermove', function(evt) {
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
			popup.show(evt.coordinate, config.tooltipHandler(feature));
	  	  } else {
			popup.hide();
	 	  }	  
		});
	}
}