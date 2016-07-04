function GlassyPanZoom(options) {

    this.control = new OpenLayers.Control.PanZoom(options);

    OpenLayers.Util.extend(this.control,{
        /**
     * Method: draw
         *
         * Parameters:
         * px - {<OpenLayers.Pixel>} 
         * 
         * Returns:
         * {DOMElement} A reference to the container div for the PanZoom control.
         */
        imageBase: 'theme/img/nav/',
        draw: function(px) {
            // initialize our internal div
            OpenLayers.Control.prototype.draw.apply(this, arguments);
            px = this.position;

            // place the controls
            this.buttons = [];

            var sz = new OpenLayers.Size(27,27);
            var centered = new OpenLayers.Pixel(px.x+sz.w/2 +10, px.y);

            this._addButton("panup", "north-mini.png", centered, sz);
            px.y = centered.y+sz.h -4 ;
            this._addButton("panleft", "west-mini.png", px, sz);
            this._addButton("panright", "east-mini.png", px.add(sz.w +20, 0), sz);
            this._addButton("pandown", "south-mini.png", 
                            centered.add(0, sz.h*2-8 ), sz);
            sz = new OpenLayers.Size(23,23);
            this._addButton("zoomin", "zoom-plus-mini.png", 
                            px.add(0, sz.h*3-8), sz);
            this._addButton("zoomworld", "zoom-world-mini.png", 
                            px.add((sz.w+2)*1 , sz.h*3-8), sz);
            this._addButton("zoomout", "zoom-minus-mini.png", 
                            px.add((sz.w+2)*2 , sz.h*3-8), sz);
						  
		    this.div.style.top = "120px";
            return this.div;
        },
         /**
         * Method: _addButton
         * 
         * Parameters:
         * id - {String} 
         * img - {String} 
         * xy - {<OpenLayers.Pixel>} 
         * sz - {<OpenLayers.Size>} 
         * 
         * Returns:
         * {DOMElement} A Div (an alphaImageDiv, to be precise) that contains the
         *     image of the button, and has all the proper event handlers set.
         */
        _addButton:function(id, img, xy, sz) {	
			var imgLocation = this.imageBase + img;
			var btn = OpenLayers.Util.createAlphaImageDiv(
										this.id + "_" + id, 
										xy, sz, imgLocation, "absolute");
			btn.style.cursor = "pointer";
			//we want to add the outer div
			this.div.appendChild(btn);
			btn.action = id;
			btn.className = "olButton";
		
			//we want to remember/reference the outer div
			this.buttons.push(btn);
			return btn;
        }
    
    });
    return this.control;
}
