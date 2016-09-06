//dependencies
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/FigisMap/FigisMap-vector.js');

/**
 * FigisMap.rnd.configurePopup
 * An function to configure a popup. At now the popup can be configured on a featured layer. 
 * It may be extended to other supports (map, getfeatureinfo)
 * 
 * Differences of popup behaviors:
 * - In case of "getfeature" strategy, the popup is based on "GetFeature" operation made on a layer of class {ol.layer.Vector}
 * - In case of "getfeatureinfo" strategy, the popup is based on "GetFeatureInfo" operation made on a WMS layer
 *
 * Each popup config may have the following parameters
 * -> id (mandatory) id of the popup
 * -> strategy (mandatory) one of the following values:
 *		- "getfeature": in this case popup will be associated to a vector layer based on feature
 * 		- "getfeatureinfo": in this case popup will be associated to Tile layer on pixel getFeatureInfo request
 * -> refs (optional) mandatory if strategy is equal to "getfeatureinfo"
 * -> multiple (optional) default is false. If true, the popup will try to display content from all contentHandlers for
 *    for the refs having a GetFeatureInfo non-empty response
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
	
	if( !config.id ) alert("Missing popup config 'id'");	
	if( !config.strategy ) alert("Missing popup config 'strategy'");
	if( !config.contentHandler ) alert("Missing popup config 'contentHandler'");

	//configure popup
	var popup = new ol.Overlay.Popup({id: config.id});
	popup.config = config;
	map.addOverlay(popup);
	
	//display popup on singleclick depending on strategy "getfeature" or "getfeatureinfo"
	if(config.strategy === "getfeature"){
		//"getfeature" strategy (vector feature based)
		//---------------------

		map.on('singleclick', function(evt) {
	  		FigisMap.rnd.getFeatureEventHandler(evt, map, popup);	
		});

	}else if(config.strategy === "getfeatureinfo"){
		//"getfeatureinfo" strategy (tile based)
		//-------------------------
		
		if( !config.refs ) alert("Missing popup config 'refs'");

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
	
	if( popup.config.beforeevent) popup.config.beforeevent();

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
		FigisMap.rnd.showPopupForCoordinates(popup, feature, null, coords);
	}else{
		if( popup.config.afterevent) popup.config.afterevent();	
	}
}

/**
 * FigisMap.rnd.getFeatureInfoEventHandler
 * @param evt
 * @param map
 * @param popup
 */
FigisMap.rnd.getFeatureInfoEventHandler = function(evt, map, popup){
	console.log("=============================================");
	
	if( popup.config.beforeevent) popup.config.beforeevent();

	var coords = evt.coordinate;
  	var viewResolution = map.getView().getResolution();
	var viewProjection = map.getView().getProjection().getCode()	

	//prepare GetFeatureInfo Urls
	var urls = new Array();
	for(var i=0;i<popup.config.refs.length;i++){
		var gfiConfig = popup.config.refs[i];
		
		if( !gfiConfig.id ) alert("Missing popup config 'id'");
		
		var layer = FigisMap.ol.getLayer(map, gfiConfig.id);	
		var url = layer.getSource().getGetFeatureInfoUrl(
      			coords, viewResolution, viewProjection,
      			{'INFO_FORMAT': "application/vnd.ogc.gml"}
		);
		if (url) urls.push(url);
	}

	var i = 0;
	var iterating = true;
	var targetFeatures = new Array();
	var targetXmlHttpRequests = new Array();
	var getFeatureInfo = function() {
		
    		var xmlHttp = FigisMap.getXMLHttpRequest();
		xmlHttp.onreadystatechange = function() {
			if ( xmlHttp.readyState != 4 ) return void(0);
			if ( xmlHttp.status == 200) {
				
				var features = FigisMap.ol.readFeatures(xmlHttp.responseXML);
				if(features.length > 0){
					for(var j=0;j<features.length;j++){
						var f = features[j];	
						f.layer = popup.config.refs[i].id;	
						targetFeatures.push(f);
					}	
					targetXmlHttpRequests.push(xmlHttp);
					if(!popup.config.multiple) iterating = false;
				}
				
				if (urls.length > 0) {
					if(iterating){
						i++;
       				     		getFeatureInfo();
					}
        			}else{
					if(targetFeatures.length > 0){
						//prepare output feature collection
						var fc = new Object();
						for(var k=0;k<targetFeatures.length;k++){
							var feature = targetFeatures[k];
							var layer = feature.layer;
							if(!fc[layer]) fc[layer] = {features: new Array()};
							fc[layer].features.push(feature);
						}
						
						//fetch/grab resources in case of specific feature resource Handlers		
						var layers = Object.keys(fc);
						var resourceUrls = new Array();
						for(var k=0;k<layers.length;k++){
							var layer = layers[k];
							var layerRef = "";
							for(var j=0;j<popup.config.refs.length;j++){
								if(layer === popup.config.refs[j].id){
									layerRef = popup.config.refs[j];
									break;
								}
							}
							
							if(typeof layerRef.resourceHandler != "undefined"){
								fc[layer].resources = new Array();
								for(var j=0;j<fc[layer].features.length;j++){
									var sf = fc[layer].features[j];
									resourceUrls.push( {layer: layer, url: layerRef.resourceHandler(sf)});
								}
							}
						}
						
						if(resourceUrls.length > 0){
							var fetchResource = function(){
								var xhr = FigisMap.getXMLHttpRequest();
								var targetResource = resourceUrls.shift();
								xhr.onreadystatechange = function() {
									if ( xhr.readyState != 4 ) return void(0);
									if ( xhr.status == 200) {
										fc[targetResource.layer].resources.push(xhr);
										if(resourceUrls.length > 0){
											fetchResource();
										}else{
											FigisMap.rnd.showPopupForCoordinates(popup, fc, targetXmlHttpRequests, coords);
										}
									}else{
										if(resourceUrls.length == 0) FigisMap.rnd.showPopupForCoordinates(popup, fc, targetXmlHttpRequests, coords);
									}			
								};
								
								xhr.open('GET', targetResource.url, true);
								xhr.send('');
							}
							fetchResource();
	
						}else{
							FigisMap.rnd.showPopupForCoordinates(popup, fc, targetXmlHttpRequests, coords);
						}
						
					}else{
						if( popup.config.afterevent) popup.config.afterevent();
					}
				}
			}
			
		};
    		xmlHttp.open('GET', urls.shift(), true);
        	xmlHttp.send('');
   	}
	getFeatureInfo();

	
}


/**
 * Show Popup for a feature
 * @param {ol.Overlay.Popup} the target popup overlay
 * @param {ol.Feature} the feature(s) to be used for resource and content handling
 * @param {Object} xmlHTTPRequest object to be used for resource and content handling
 * @param {ol.Coordinate} the coordinates where the popup should be opened
 */
FigisMap.rnd.showPopupForCoordinates = function(popup, feature, xmlHttp, coords) {
	
	var async = !!popup.config.resourceHandler;

	if( async ) {
		
		xmlHttp = FigisMap.getXMLHttpRequest();
		xmlHttp.onreadystatechange = function() {
			if ( xmlHttp.readyState != 4 ) return void(0);
			if (xmlHttp.status == 200) {
				FigisMap.debug('FigisMap.rnd.popup - async request: ', xmlHttp);
				if( popup.config.afterevent) popup.config.afterevent();	
				popup.show(coords, popup.config.contentHandler(feature, xmlHttp));
				if( popup.config.onopen) popup.config.onopen(feature);
			}
		};
		
		xmlHttp.open('GET', popup.config.resourceHandler(feature), true);
		xmlHttp.send('');
	} else {
		if( popup.config.afterevent) popup.config.afterevent();		
		popup.show(coords, popup.config.contentHandler(feature, xmlHttp));
		if( popup.config.onopen) popup.config.onopen(feature);
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
	FigisMap.rnd.showPopupForCoordinates(popup, feature, null, feature.getGeometry().getCoordinates());
}

/**
 * Emulates popup for coordinates - To be used with TileWMS source layer
 * @param map object of class {ol.Map}
 * @param feature a object of class {ol.Feature}
 */
FigisMap.rnd.emulatePopupForCoordinates = function(map, id, coords){
	var popup = FigisMap.rnd.getPopupOverlay(map, id);
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