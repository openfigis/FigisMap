/**
 * FigisMap.rnd.configurePopup
 * An experimental function to configure a popup. At now the popup can be configured
 * on a featured layer. It may be extended to other supports (map, getfeatureinfo)
 * @param map
 * @param config
 */
FigisMap.rnd.configurePopup = function(map, config) {

	if( !config.handler ) alert("Missing popup config 'handler'");

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
		popup.show(evt.coordinate, config.handler(feature));
	  }
	});
}