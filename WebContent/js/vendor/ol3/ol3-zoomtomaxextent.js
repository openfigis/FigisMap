/**
 * @classdesc
 * A button control which, when pressed, changes the map view to a max
 * extent. To style this control use the OL native css selector `.ol-zoom-extent`.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {olx.control.ZoomToMaxExtentOptions=} opt_options Options.
 * 
 * @author eblondel <emmanuel.blondel1@gmail.com>
 *
 */
ol.control.ZoomToMaxExtent = function(opt_options) {
  var options = opt_options ? opt_options : {};

  /**
   * @type {ol.Extent}
   * @private
   */
  this.extent_ = options.extent ? options.extent : null;

  /**
   * @type {integer}
   * @private
   */
  this.zoom_ = options.zoom ? options.zoom : null;

  var className = options.className ? options.className : 'ol-zoom-max-extent';

  var tipLabel = options.tipLabel ? options.tipLabel : 'Fit to extent';
  var label = options.label ? options.label : '<img title="'+tipLabel+'" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAoCAMAAABU4iNhAAADAFBMVEWMjIzV1dXq6ur////5+fng4ODW1tbn5+f8/Pzu7u7p6enQ0ND09PTc3Nzf39/U1NTi4uL7+/ve3t7t7e3h4eH9/f3a2trd3d3z8/Ps7Oz6+vr19fX29vbS0tLj4+Pb29vZ2dnv7+/+/v7r6+vR0dHl5eXY2Njo6Oj4+PjX19cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAuAAAuNggAAFgAAAAAAQAAAAAAAAAAAAAAAAAuOdQt5zgAADQAAAAuNjwuNjwAACQAAAAAAEAAAAAAAAAAAAAAATgAABNBfMAAAAAAAAArEzwrEzwAACQAAAAAAAAAAAAAAAABAAAABKwAABNBfMAAAAAAAAAuNqQuNqQAAsgAAAAAAAAAAAAAAAAAAAAQAAAuNsguNsgAAqQAAAAuNtguNtgAACQAAACAAAAAAAAAAAAAAAAAADQAABNBfMAAAAAAAAArEzwrEzwAACQAAAAAAAAAAAAABAAAAAAAAGgAABNBfMAAAAAAAAArEzwrEzwAACQAAAAAAAAAAAAAAAAAAAAAAJwAABNBfMAAAAAAAAAuN3QuN3QAASgAAAAAAAAAAAAAAAAAAAAAAAAuN5guN5gAAQQAAAAt5kQt5kQAAFgAAAAAAAAAAAAAAAAAAAAAAAAuPKwuO6gAADQAAAArEzwrEzwAACQAAAAAAAAAAAAAAAAAAAAAAGgAABNBfMAAAAAAAAArEzwrEzwAACQAAAAAAAAAAAAAAAAAAAAAAJwAABNBfMAAAAAAAAArEzwrEzwAACQAAAAAAAAAAAAgAAAAAAAAANAAABNBfMAAAAAAAAArEzwrEzwAACQAAAAAAADJYlCnAAAAAXRSTlMAQObYZgAAAAlwSFlzAAAN1wAADdcBQiibeAAAAQ5JREFUeNrdkckWgjAMRaNPpY4gOA84o/7/D9oUUKDReo66MQtI09vkJSH6Z6vdvTrQaLLTcr/yFNB+BaDoA52n5aEKp65GezLYBwb894N7UgwlMNQXKiXqOag7kzSyeXoCEUJz9kxkZIHjrNaEpmlfPfINWgVnHJwad57HWhpbYFlUSDQwz1drrMp6KOakYaU2KsVq+rShLZp2Ow8BxoJ08qUhP8hibG4Ex2WQILTJC1rvUJKuyYBme2tyDSFBJG3tIEiio0RK4ol2NniSyeR5SkUuy8nkbVK4OFsR/VnEYoq+sxCbYnTpoiY8UiPKXpQwlmwloe+uf8ma3bvR98lUgBu7yp1+bJtvJPmB3QBVognUglnqqQAAAABJRU5ErkJggg==" />';
  

  var button = document.createElement('button');
  button.setAttribute('title', tipLabel);
  button.innerHTML = label;

  var this_ = this;

  button.onclick = function(e) {
	this_.handleClick_(e);
  }
  button.ontouchstart = function(e) {
	this_.handleClick_(e);
  }

  var element = document.createElement('div');
  element.className = className + ' ' + 'ol-unselectable' + ' ' + 'ol-control';
  element.appendChild(button);

  ol.control.Control.call(this, {
	element: element,
	target: options.target
  });
};

ol.inherits(ol.control.ZoomToMaxExtent, ol.control.Control);


/**
 * @param {goog.events.BrowserEvent} event The event to handle
 * @private
 */
ol.control.ZoomToMaxExtent.prototype.handleClick_ = function(event) {
  event.preventDefault();
  this.handleZoomToMaxExtent_();
};


/**
 * @private
 */
ol.control.ZoomToMaxExtent.prototype.handleZoomToMaxExtent_ = function() {
  var map = this.getMap();
  var view = map.getView();
  var extent = !this.extent_ ?
      view.getProjection().getExtent() : this.extent_;
  var size = map.getSize();
  view.fit(extent, size);

  //adding zoom level
  if( this.zoom_ ) view.setZoom(this.zoom_);
};