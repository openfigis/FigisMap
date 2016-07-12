FigisMap.rnd.configureGetFeatureInfoSource = function(map, source, target, handlers) {

	map.on('singleclick', function(evt) {
  		//document.getElementById(target).innerHTML = '';
  		var viewResolution = /** @type {number} */ (map.getView().getResolution());
  		
		handlers.before();	

		var url = source.getGetFeatureInfoUrl(
      			evt.coordinate, viewResolution, map.getView().getProjection().getCode(),
      			{'INFO_FORMAT': '"application/vnd.ogc.gml"'}
		);
  		if (url) {
			console.log(url);
    			//document.getElementById(target).innerHTML = '<iframe seamless src="' + url + '"></iframe>';
  		}
	});

	map.on('pointermove', function(evt) {
  		if (evt.dragging) {
    			return;
  		}
  		var pixel = map.getEventPixel(evt.originalEvent);
  		var hit = map.forEachLayerAtPixel(pixel, function(layer) {
    			return true;
  		});
  	
		//map.getTargetElement().style.cursor = hit ? 'pointer' : '';
	});


}