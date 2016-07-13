/**
 * FigisMap.rnd.configureVectorSource
 * An experimental function to configure a vector source
 * @param sourceUrl
 * @param cqlfilter
 * @return an object of class {ol.source.Vector}
 */
FigisMap.rnd.configureVectorSource = function(sourceUrl, cqlfilter) {
	return new ol.source.Vector({
		format : new ol.format.GeoJSON(),
		url : sourceUrl + ((!!cqlfilter)? ('&cql_filter='+cqlfilter) : '')  + '&outputFormat=json'
	});
}

/**
 * FigisMap.rnd.configureClusterSource
 * An experimental function to configure a cluster source
 * @param layer
 * @param source
 * @return an object of class {ol.source.Vector}
 */
FigisMap.rnd.configureClusterSource = function(layer, source) {
	return new ol.source.Cluster({
		distance : layer.clusterOptions.distance ? layer.clusterOptions.distance : 0,
		source : source
	});
}

/**
 * FigisMap.rnd.addVectorLayer
 * An experimental function to configure a vector layer, clustered or not
 * @param map
 * @param overlays
 * @param layer
 */
FigisMap.rnd.addVectorLayer = function(map, overlays, layer) {

	if( !layer.id ) alert("Missing vector layer 'id'");
	if( !layer.source ) alert("Missing vector layer 'source'");
	if( !layer.title ) alert("Missing vector layer 'title'");
	if( !layer.iconHandler ) alert("Missing vector layer 'iconHandler'");

	//data access
	var sourceFeatures = layer.source;

	if( !!layer.cluster ) {
	
		
		if (!layer.clusterOptions.hasOwnProperty('singlecount')) layer.clusterOptions.singlecount = true;

		// configure the cluster source
		var clusterFeatures = FigisMap.rnd.configureClusterSource(layer, sourceFeatures);

		if(!layer.hasOwnProperty('iconHandler')) layer.iconHandler = function(feature){return layer.icon;};
		

		// Animated cluster layer
		var clusterLayer = new ol.layer.AnimatedCluster({
			id : layer.id,
			title : layer.title,
			source : clusterFeatures,
			animationDuration : 0,
			style : function(feature, resolution){

				var features = feature.get('features');
				var size = features.length;

				var styles = new Array();
				var icons = new Array();

				for(var i=0;i<features.length;i++){
					var feature = features[i];
					var featureIcon = (layer.clusterOptions.hasOwnProperty('icon') & size > 1)? layer.clusterOptions.icon : layer.iconHandler(feature);
					if(icons.indexOf(featureIcon) == -1){

						icons.push( featureIcon );
						styles.push( new ol.style.Style({
							image : new ol.style.Icon({
								anchor : [ 0.5,1 ],
								anchorXUnits : 'fraction',
								anchorYUnits : 'fraction',
								opacity : 0.75,
								src : featureIcon
							}),
							text : (!layer.clusterOptions.singlecount && size == 1)? null : new ol.style.Text({
								text : size.toString(),
								offsetY : -16,
								scale : 1.2,
								fill : new ol.style.Fill({
									color : '#fff'
								})
							})
						}) );
						
					}
				}

				return styles;
			}
		});

		//manage icon image caches
		var cachedIcons = new Array();
		var listenerKey = sourceFeatures.on('change', function(e) {
  			if (sourceFeatures.getState() == 'ready') {

				var features = sourceFeatures.getFeatures();
				for(var i=0;i<features.length;i++){
					var icon = layer.iconHandler(features[i]);
					var isCached = false;
					for(var j=0;j<cachedIcons.length;j++){
						if(cachedIcons[j].src.endsWith(icon)){
							isCached = true;
							break;
						}
					}
					if(!isCached){
						var iconImage = new Image();
						iconImage.src = icon;
						cachedIcons.push(iconImage);
					}
				}

    				ol.Observable.unByKey(listenerKey);
     			}
		});


		//adding layer.id to layer object
		clusterLayer.id = layer.id;
		
		//adding layer.icon to layer object (for inheriting in layerswitcher)
		clusterLayer.legendGraphic = layer.icon;
		clusterLayer.showLegendGraphic = layer.showLegendGraphic ? layer.showLegendGraphic : false;

		if ( overlays ) {
			overlays.getLayers().push(clusterLayer);
		} else {
			map.addLayer(clusterLayer);
		}

		// Select interaction to spread cluster out and select features
		var selectCluster = new ol.interaction.SelectCluster({
			pointRadius : 15,
			radiusFactor: 1.3,
			spiral : true,
			circleMaxObjects : 10,
			animate : layer.clusterOptions.animate ? layer.clusterOptions.animate : false,
			// Feature style when it springs apart
			featureStyle : function(feature, resolution){

				var features = feature.get('features');
				var feat = undefined;
				if(features) feat = features[0];

				var fill = new ol.style.Fill({
					color: 'rgba(255,255,255,0.4)'
 				});
				var stroke = new ol.style.Stroke({
					color: '#3399CC',
					width: 1.6
				});

				//use directly cached image
				var iconImg = null;
				for(var i=0;i<cachedIcons.length;i++){
					if(cachedIcons[i].src.endsWith(layer.iconHandler(feat))){
						iconImg = cachedIcons[i];
						break;				
					}				
				}
			
				var styles = [
   					new ol.style.Style({
     						image : new ol.style.Icon({
							anchor : [ 0.5, 1 ],
							anchorXUnits : 'fraction',
							anchorYUnits : 'fraction',
							opacity : 0.75,
							img: iconImg,
							imgSize: [iconImg.width, iconImg.height]
						}),
     						fill: fill,
     						stroke: stroke
   					})
 				];

				return styles;
			}


		});
		map.addInteraction(selectCluster);
		
	} else {
		alert("Only Cluster vector layers are currently supported by FigisMap");
	}
}


/**
 * FigisMap.rnd.updateVectorLayer
 * An experimental function to configure a vector layer, clustered or not
 * @param map
 * @param layer
 */
FigisMap.rnd.updateVectorLayer = function(map, layer) {

	var source = layer.source;
	if( layer.cluster ) {
		source = FigisMap.rnd.configureClusterSource(layer, source);
	}	


	var layers = map.getLayers().getArray();
	if( layers.length > 0 ) {
		if(layers[0] instanceof ol.layer.Group)	{
			layers = map.getLayerGroup().getLayersArray();
		}
		for(var i=0;i<layers.length;i++){
			if(layers[i].id){
				if(layers[i].id === layer.id) {
					map.getLayerGroup().getLayersArray()[i].setSource(source);
					//map.getLayerGroup().getLayersArray()[i].getSource().changed();
					break;
				}
			}
		}
	}
}


/**
 * FigisMap.rnd.addVectorLayerLegend
 * @param layer
 * @param useTables
 * @return the html legend content as string
 */
FigisMap.rnd.addVectorLayerLegend = function( layer , useTables) {
	var LegendHTML = "";
	var iconHTML = '<img src="' + layer.icon +'"/>';
	LegendHTML += '<tr><td>' + iconHTML + '</td><td><span>' + layer.title + '</span></td></tr>';
	return LegendHTML;
};

/**
 * FigisMap.rnd.addVectorLayerLegend
 * @param layer
 * @param useTables
 * @return the html legend content as string
 */
FigisMap.ol.getVectorLayerFeatureById = function(map, property, value) {
	
	//get target vector layer
	var vectorlayer;
	var overlays = map.getLayers().getArray()[1].getLayers().getArray();
	for(var i=0; i<overlays.length;i++){
		if(overlays[i] instanceof ol.layer.Vector){
			vectorlayer = overlays[i];
			break;
		}
	}
			
	//get source feature with id
	var feat;
	if ( vectorlayer ) {
		var srcCluster = vectorlayer.getSource();
		var srcFeatures = srcCluster.getSource();
		srcFeatures.getFeatures().forEach(function(feature) { if(feature.get(property) == String(value)) feat = feature;  });
	}
	
	return feat;
}
