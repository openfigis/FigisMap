/**
 * FigisMap.rnd.configureVectorLayer
 * An experimental function to configure a vector layer, clustered or not
 * @param map
 * @param overlays
 * @param layer
 */
FigisMap.rnd.addVectorLayer = function(map, overlays, layer) {

	if( !layer.source ) alert("Missing vector layer 'source'");
	if( !layer.title ) alert("Missing vector layer 'title'");
	if( !layer.icon ) alert("Missing vector layer 'icon'");
	
	//data access
	var sourceFeatures = new ol.source.Vector({
		format : new ol.format.GeoJSON(),
		url : layer.source + '&outputFormat=json'
	});

	if( !!layer.cluster ) {
	
		if( !layer.clusterOptions ) {
			layer.clusterOptions = {
				distance: 0,
				animate: false
			}
		}
		
		var useClusterIcon = true;
		if( !layer.clusterIcon) {
			layer.clusterIcon = layer.icon;
			useClusterIcon = false;
		}
		
		// configure the cluster source
		var clusterFeatures = new ol.source.Cluster({
			distance : layer.clusterOptions.distance ? layer.clusterOptions.distance : 0,
			source : sourceFeatures
		});
	
		// Animated cluster layer
		var clusterLayer = new ol.layer.AnimatedCluster({
			title : layer.title,
			source : clusterFeatures,
			animationDuration : 0,
			// Cluster style
			style : function(feature, resolution) {
				var size = feature.get('features').length;
				var style = [ new ol.style.Style({
					image : new ol.style.Icon(({
						anchor : [ 0.5, 36 ],
						anchorXUnits : 'fraction',
						anchorYUnits : 'pixels',
						opacity : 0.75,
						src : (size == 1 && useClusterIcon) ? layer.icon : layer.clusterIcon
					})),
					text : size == 1 ? null : new ol.style.Text({
						text : size.toString(),
						offsetY : -20,
						scale : 1.2,
						fill : new ol.style.Fill({
							color : '#fff'
						})
					})
				}) ];
				return style;
			}
		});

		//adding layer.icon to layer object (for inheriting in layerswitcher)
		clusterLayer.icon = layer.icon;

		if ( overlays ) {
			overlays.getLayers().push(clusterLayer);
		} else {
			map.addLayer(clusterLayer);
		}
		
	
		// Select interaction to spread cluster out and select features
		var selectCluster = new ol.interaction.SelectCluster({ 
			pointRadius : 15,
			animate : layer.clusterOptions.animate ? layer.clusterOptions.animate : false,
			// Feature style when it springs apart
			featureStyle : function() {
				return [ new ol.style.Style({
					image : new ol.style.Icon(({
						anchor : [ 0.5, 25 ],
						anchorXUnits : 'fraction',
						anchorYUnits : 'pixels',
						opacity : 0.75,
						src : layer.icon
					}))
				}) ]
			}
		});
		map.addInteraction(selectCluster);
		
	} else {
		alert("Only Cluster vector layers are currently supported by FigisMap");
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