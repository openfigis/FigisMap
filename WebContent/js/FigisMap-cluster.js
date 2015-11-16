

/**
 * FigisMap.rnd.configureVectorLayer
 * An experimental function to configure a vector layer, clustered or not
 * @param map
 * @param overlays
 * @param layer
 */
FigisMap.rnd.configureVectorLayer = function(map, overlays, layer) {

	if( !layer.source ) alert("Missing vector layer 'source'");
	if( !layer.title ) alert("Missing vector layer 'title'");
	if( !layer.icon ) alert("Missing vector layer 'icon'");
	
	// Data access
	var xmlHttpTimeout = false;
	var sourceFeatures;
	var xmlHttp = FigisMap.getXMLHttpRequest();
	xmlHttp.onreadystatechange = function() {
		if ( xmlHttp.readyState != 4 ) return void(0);
		if (xmlHttp.status == 200) {
			
			sourceFeatures = FigisMap.ol.readFeatures( xmlHttp.responseXML );
			
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
			xmlHttp = false;
		}
	};
	xmlHttp.open('GET', FigisMap.useProxy ? escape( layer.source ) : layer.source, true);
	xmlHttp.send('');
	
}