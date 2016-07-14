/**
 * FigisMap.rnd.configurePopup
 * An function to configure a popup. At now the popup can be configured on a featured layer. 
 * It may be extended to other supports (map, getfeatureinfo)
 * 
 * Differences of popup behaviors:
 * - In case of "getfeature" strategy, config will be a single config Object, declared by FigisMap. The popup will
 *   be based on "GetFeature" operation made on a layer of class {ol.layer.Vector}
 *
 * - In case of "getfeatureinfo" strategy, FigisMap will set config as array of "getfeatureinfo" configs to manage
 *   one single popup overlay in case of multiple configs, and control that popup will be displayed only for the
 *   first popup config declared as FigisMap parameter, and with actual content. The popup is based on "GetFeatureInfo"
 *   operation made on a WMS layer
 *
 * Each popup config may have the following parameters
 * -> id (mandatory) id of the popup
 * -> strategy (mandatory) one of the following values:
 *		- "getfeature": in this case popup will be associated to a vector layer based on feature
 * 		- "getfeatureinfo": in this case popup will be associated to Tile layer on pixel getFeatureInfo request
 * -> resourceHandler (optional) the url of a web-resource to load asynchronously
 * -> contentHandler (mandatory) a function with the following arguments:
 * 		- feature: the GIS feature from which to extract property values
 * 		- response: the response of the asynchronous call (if urlHandler provided)
 * -> onopen (optional) a function (with feature argument) to do some stuff when the popup is opened
 * -> onclose (optional) a function (with feature argument) to do some stuff when the popup is closed
 * 
 * @param {ol.Map} the current map
 * @param config
 */
FigisMap.rnd.configurePopup = function(map, config) {
	
	//configure popup
	var popup = new ol.Overlay.Popup({id: ((config instanceof Array)? "getfeatureinfo" : config.id)});
	popup.config = config;
	map.addOverlay(popup);
	
	
	//display popup on singleclick depending on strategy "getfeature" or "getfeatureinfo"
	if(config.strategy === "getfeature"){
		//"getfeature" strategy (vector feature based)
		//---------------------

		if( !config.id ) alert("Missing popup config 'id'");
		if( !config.strategy ) alert("Missing popup config 'strategy'");
		if( !config.contentHandler ) alert("Missing popup config 'contentHandler'");

		map.on('singleclick', function(evt) {
	  		FigisMap.rnd.getFeatureEventHandler(evt, map, popup);	
		});

	}else{
		//"getfeatureinfo" strategy (tile based)
		//-------------------------
		
		popup.gfiConfigs = config;

		map.on('singleclick', function(evt) {
			FigisMap.rnd.getFeatureInfoEventHandler(evt, map, popup);
		});
	}
	
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
 * FigisMap.rnd.getFeatureEventHandler
 * @param evt
 * @param map
 * @param popup
 */
FigisMap.rnd.getFeatureEventHandler = function(evt, map, popup){
	var feature = map.forEachFeatureAtPixel(evt.pixel,
		function(feature, layer) {
						
			if (layer) if(layer.id != popup.config.id) return;

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
		}
	);
	  
	if (feature) {
		var coords = feature.getGeometry().getCoordinates();
		FigisMap.rnd.showPopupForCoordinates(popup, feature, coords);
	}
}

/**
 * FigisMap.rnd.getFeatureInfoEventHandler
 * @param evt
 * @param map
 * @param popup
 */
FigisMap.rnd.getFeatureInfoEventHandler = function(evt, map, popup){
	var coords = evt.coordinate;
  	var viewResolution = map.getView().getResolution();
	var viewProjection = map.getView().getProjection().getCode()
			
	for(var i=0;i<popup.gfiConfigs.length;i++){
		var gfiConfig = popup.gfiConfigs[i];
		if( !gfiConfig.id ) alert("Missing popup config 'id'");
		if( !gfiConfig.strategy ) alert("Missing popup config 'strategy'");
		if( !gfiConfig.contentHandler ) alert("Missing popup config 'contentHandler'");

		var layer = FigisMap.ol.getLayer(map, gfiConfig.id);			
		var url = layer.getSource().getGetFeatureInfoUrl(
      			coords, viewResolution, viewProjection,
      			{'INFO_FORMAT': "application/vnd.ogc.gml"}
		);
		if (url){
			gfiConfig.resourceHandler = function(feature){ return url; }
			popup.config = gfiConfig;
			var shown = FigisMap.rnd.showPopupForCoordinates(popup, null, coords);
			if(shown) break;
		}
	}	
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
				var display = true
				if(popup.config.strategy == "getfeatureinfo"){
					var features = FigisMap.ol.readFeatures(xmlHttp.responseXML);
					if(features.length == 0) display = false;
				}
				
				if(display){
					popup.show(coords, popup.config.contentHandler(feature, xmlHttp));
					if( popup.config.onopen) popup.config.onopen(feature);
				}
				return display;
			}
		};
		
		xmlHttp.open('GET', popup.config.resourceHandler(feature), true);
		xmlHttp.send('');
	} else {
		popup.show(coords, popup.config.contentHandler(feature, null));
		if( popup.config.onopen) popup.config.onopen(feature);
		return true;	
	}
}


/**
 * Emulates popup for a feature - To be used with vector layer in combination with 
 * FigisMap.ol.getVectorLayerFeatureById to get feature)
 * @param map object of class {ol.Map}
 * @param id the id of the popup overlay
 * @param feature a object of class {ol.Feature}
 */
FigisMap.rnd.emulatePopupForFeature = function(map, id, feature){
	var popup = FigisMap.rnd.getPopupOverlay(map, id);
	FigisMap.rnd.showPopupForCoordinates(popup, feature, feature.getGeometry().getCoordinates());
}

/**
 * Emulates popup for coordinates - To be used with TileWMS source layer
 * @param map object of class {ol.Map}
 * @param feature a object of class {ol.Feature}
 */
FigisMap.rnd.emulatePopupForCoordinates = function(map, coords){
	var popup = FigisMap.rnd.getPopupOverlay(map, "getfeatureinfo");
	var event = {coordinate: coords, map: map, pixel: [100,10], wasVirtual: true};
	FigisMap.rnd.getFeatureInfoEventHandler(event, map, popup);
}


/**
 * FigisMap.rnd.configureTooltipPopup
 * An function to configure a tooltip popup.
 * 
 * The config may have the following parameters
 * -> id (mandatory) id of the popup
 * -> tooltipHandler a function with the following arguments:
 * 		- feature: the GIS feature from which to extract property values
 * 
 * @param {ol.Map} the current map
 * @param config
 */
FigisMap.rnd.configureTooltipPopup = function(map, config) {
	
	if( !config.id ) alert("Missing popup config 'id'");

	if( !!config.tooltipHandler ) {
	
		//configure popup
		var popup = new ol.Overlay.Popup({id: config.id, isTooltip: true});
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
		    }
		  );
	  
	  	  if (feature) {
			if(!feature.get('selectclusterlink')){
				popup.show(evt.coordinate, config.tooltipHandler(feature));
			}else{
				popup.hide();
			}
	  	  } else {
			popup.hide();
	 	  }	  
		});
	}
}