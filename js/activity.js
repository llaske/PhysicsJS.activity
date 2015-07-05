define(function (require) {
    var activity = require("sugar-web/activity/activity");

    // Manipulate the DOM only when it is ready.
    require(['domReady!'], function (doc) {

        // Initialize the activity
        activity.setup();
		
		// Initialize cordova
		var useragent = navigator.userAgent.toLowerCase();
		var sensorButton = document.getElementById("sensor-button");
		var readyToWatch = false;
		var sensorMode = true;
		if (useragent.indexOf('android') != -1 || useragent.indexOf('iphone') != -1 || useragent.indexOf('ipad') != -1 || useragent.indexOf('ipod') != -1 || useragent.indexOf('mozilla/5.0 (mobile') != -1) {
			document.addEventListener('deviceready', function() {
				readyToWatch = true;
			}, false);
			sensorButton.disabled = false;
			sensorButton.classList.add('active');
		} else {
			sensorButton.disabled = true;
		}
			
		// Initialize the world
		var body = document.getElementById("body");
		var innerWidth = body.offsetWidth;
		var innerHeight = body.offsetHeight;
		var toolbarHeight = 55;
		var outerWidth = 0; // Use to determine if items could disappear, could be 300;
		var init = false;
		var gravityMode = 0;
		var currentType = 0;
		Physics({ timestep: 6 }, function (world) {

			// bounds of the window
			var viewWidth = innerWidth
				,viewportBounds = Physics.aabb(0-outerWidth, toolbarHeight, innerWidth+outerWidth, innerHeight)
				,edgeBounce
				,renderer
				;

			// let's use the pixi renderer
			require(['pixi'], function( PIXI ){
				window.PIXI = PIXI;
				// create a renderer
				renderer = Physics.renderer('pixi', {
					el: 'viewport'
				});

				// add the renderer
				world.add(renderer);
				// render on each step
				world.on('step', function () {
					world.render();
					if (!init) {
						init = true;
						zoom();
					}
					if (readyToWatch) {
						watchId = navigator.accelerometer.watchAcceleration(accelerationChanged, null, { frequency: 500 });
						readyToWatch = false;
					}
				});
				// add the interaction
				world.add(Physics.behavior('interactive', { el: renderer.container }));
			});

			// constrain objects to these bounds
			edgeBounce = Physics.behavior('edge-collision-detection', {
				aabb: viewportBounds
				,restitution: 0.2
				,cof: 0.8
			});

			// resize events
			window.addEventListener('resize', function () {
				// as of 0.7.0 the renderer will auto resize... so we just take the values from the renderer
				viewportBounds = Physics.aabb(0-outerWidth, toolbarHeight, renderer.width+outerWidth, renderer.height);
				// update the boundaries
				edgeBounce.setAABB(viewportBounds);
				innerWidth = body.offsetWidth;
				innerHeight = body.offsetHeight;
				zoom();

			}, true);
			
			// handle toolbar buttons
			document.getElementById("box-button").addEventListener('click', function (e) {
				currentType = 1;
				switchToType(currentType);
			}, true);
			document.getElementById("circle-button").addEventListener('click', function (e) {
				currentType = 0;
				switchToType(currentType);				
			}, true);
				
			document.getElementById("triangle-button").addEventListener('click', function (e) {
				currentType = 2;
				switchToType(currentType);				
			}, true);
			
			document.getElementById("gravity-button").addEventListener('click', function () {
				setGravity((gravityMode + 1)%8);
			}, true);
			
			sensorButton.addEventListener('click', function () {
				sensorMode = !sensorMode;
				if (sensorMode)
					sensorButton.classList.add('active');
				else
					sensorButton.classList.remove('active');
			}, true);
			
			function accelerationChanged(acceleration) {
				if (!sensorMode) return;
				if (acceleration.x < -4.5) {
					if (acceleration.y > 4.75)
						setGravity(3);
					else if (acceleration.y < -4.75)
						setGravity(5);
					else
						setGravity(4);				
				} else if (acceleration.x <= 4.5 && acceleration.x >= -4.5) {
					if (acceleration.y > 4.75)
						setGravity(2);
					else if (acceleration.y < -4.75)
						setGravity(6);				
				} else if (acceleration.x > 4.5) {
					if (acceleration.y > 4.75)
						setGravity(1);
					else if (acceleration.y < -4.75)
						setGravity(7);
					else
						setGravity(0);
				}
			}

			document.getElementById("clearall-button").addEventListener('click', function () {
				world.remove(world.getBodies());
			}, true);
			
			// Save/Load world
			loadWorld();
			var stopButton = document.getElementById("stop-button");
			stopButton.addEventListener('click', function (event) {
				console.log("writing...");
				saveWorld(function (error) {
					if (error === null) {
						console.log("write done.");
					}
					else {
						console.log("write failed.");
					}
				});
			});

			var colors = [
				['0x268bd2', '0x0d394f']
				,['0xc93b3b', '0x561414']
				,['0xe25e36', '0x79231b']
				,['0x6c71c4', '0x393f6a']
				,['0x58c73c', '0x30641c']
				,['0xcac34c', '0x736a2c']
			];

			function zoom() {
				if (window.devicePixelRatio == 1) {
					return;
				}
				var canvas = document.getElementById("viewport").children[0];	
				var zoom = 1.0 / window.devicePixelRatio;
				canvas.style.zoom = zoom;
				var useragent = navigator.userAgent.toLowerCase();
				if (useragent.indexOf('chrome') == -1) {
					canvas.style.MozTransform = "scale("+zoom+")";
					canvas.style.MozTransformOrigin = "0 0";
				}
			}
			
			function random( min, max ){
				return (Math.random() * (max-min) + min)|0;
			}

			function switchToType(newtype) {
				document.getElementById("box-button").classList.remove('active');			
				document.getElementById("circle-button").classList.remove('active');			
				document.getElementById("triangle-button").classList.remove('active');
				if (newtype == 0) document.getElementById("circle-button").classList.add('active');
				else if (newtype == 1) document.getElementById("box-button").classList.add('active');
				else if (newtype == 2) document.getElementById("triangle-button").classList.add('active');
			}
			
			function dropInBody(type, pos){

				var body;
				var c;

				switch (type){

						// add a circle
					case 0:
						c = colors[random(0, colors.length-1)];
						body = Physics.body('circle', {
							x: pos.x
							,y: pos.y
							,vx: random(-5, 5)/100
							,radius: 40
							,restitution: 0.9
							,styles: {
								fillStyle: c[0]
								,strokeStyle: c[1]
								,lineWidth: 1
								,angleIndicator: c[1]
							}
						});
						break;

						// add a square
					case 1:
						c = colors[random(0, colors.length-1)];
						var l = random(0, 70);
						body = Physics.body('rectangle', {
							width: 50+l
							,height: 50+l
							,x: pos.x
							,y: pos.y
							,vx: random(-5, 5)/100
							,restitution: 0.9
							,styles: {
								fillStyle: c[0]
								,strokeStyle: c[1]
								,lineWidth: 1
								,angleIndicator: c[1]
							}
						});
						break;

						
						// add a polygon
					case 2:
					case 3:
						var s = (type == 2 ? 3 : random( 5, 10 ));
						c = colors[ random(0, colors.length-1) ];
						body = Physics.body('convex-polygon', {
							vertices: Physics.geometry.regularPolygonVertices( s, 30 )
							,x: pos.x
							,y: pos.y
							,vx: random(-5, 5)/100
							,angle: random( 0, 2 * Math.PI )
							,restitution: 0.9
							,styles: {
								fillStyle: c[0]
								,strokeStyle: c[1]
								,lineWidth: 1
								,angleIndicator: c[1]
							}
						});
						break;
				}

				body.treatment = "static";
				
				world.add( body );
				return body;
			}
			
			// Save world to datastore
			function saveWorld(callback) {
				// Build bodies list
				var bodies = world.getBodies();
				var objects = [];
				for(var i = 0 ; i < bodies.length ; i++) {
					var object = serializeObject(bodies[i]);
					objects.push(object);
				}
				
				// Save to datastore
				var datastoreObject = activity.getDatastoreObject();
				var jsonData = JSON.stringify({world: objects});
				datastoreObject.setDataAsText(jsonData);
				datastoreObject.save(callback);
			}
			
			function serializeObject(body) {
				var object = {};
				object.type = body.geometry.name;
				if (object.type == "circle") {
					object.radius = body.radius;
				} else if (body.geometry.name == "rectangle") {
					object.width = body.view.width;
					object.height = body.view.height;
				} else if (body.geometry.name == "convex-polygon") {
					object.vertices = body.vertices;
				}
				object.restitution = body.restitution;
				object.styles = body.styles;
				object.x = body.view.x;			
				object.y = body.view.y;
				return object;
			}
			
			// Load world from datastore
			function loadWorld(objects) {
				var datastoreObject = activity.getDatastoreObject();
				datastoreObject.loadAsText(function (error, metadata, data) {
					var data = JSON.parse(data);
					if (data == null)
						return;
						
					// Create bodies
					var objects = data.world;
					for(var i = 0 ; i < objects.length ; i++) {
						var newBody = deserializeObject(objects[i]);
						world.add(newBody);
					}
				});
			}
			
			function deserializeObject(savedObject) {
				var newOptions = {
					x: savedObject.x,
					y: savedObject.y,
					restitution: savedObject.restitution,
					styles: savedObject.styles
				};
				if (savedObject.type == "circle") {
					newOptions.radius = savedObject.radius;
				} else if (savedObject.type == "rectangle") {
					newOptions.width = savedObject.width;		
					newOptions.height = savedObject.height;			
				} else if (savedObject.type = "convex-polygon") {
					newOptions.vertices = savedObject.vertices;
				}
				return Physics.body(savedObject.type, newOptions);
			}
			
			// Change gravity value
			function setGravity(value) {
				if (gravityMode == value) return;
				document.getElementById("gravity-button").style.backgroundImage = "url(icons/gravity"+value+".svg)";
				var acc = {};
				switch(value) {
				case 0:
					acc = { x: 0, y: 0.0004 };
					break;
				case 1:
					acc = { x: 0.0004, y: 0.0004 };
					break;
				case 2:
					acc = { x: 0.0004, y: 0 };
					break;
				case 3:
					acc = { x: 0.0004, y: -0.0004 };
					break;
				case 4:			
					acc = { x: 0, y: -0.0004 };				
					break;
				case 5:			
					acc = { x: -0.0004, y: -0.0004 };				
					break;
				case 6:			
					acc = { x: -0.0004, y: 0 };				
					break;
				case 7:			
					acc = { x: -0.0004, y: 0.0004 };				
					break;
				}
				gravity.setAcceleration(acc);
				world.wakeUpAll();				
				gravityMode = value;
			}
			
			// add some fun interaction
			var createdBody = null;
			var createdStart = null;
			var attractor = Physics.behavior('attractor', {
				order: 0,
				strength: 0.002
			});
			world.on({
				'interact:poke': function( pos ){
					// create body at a static place
					if (pos.y > toolbarHeight) {
						createdBody = dropInBody(currentType, pos);
						createdStart = pos;
					}
				}
				,'interact:move': function( pos ){
					// update size of created body
					if (createdBody != null) {
						// compute new size
						var distx = createdStart.x - pos.x;
						var disty = createdStart.y - pos.y;
						var distance = Math.min(Math.sqrt(Math.abs(distx*distx-disty*disty)),createdStart.y-toolbarHeight);
						if (createdBody.view != null) {
							// Recreate the object with new size
							var object = serializeObject(createdBody);
							if (object.type == "circle") {
								object.radius = Math.max(40, distance);
							} else if (object.type == "rectangle") {
								object.width = object.height = Math.max(50, distance);
							} else if (object.type = "convex-polygon") {
								object.vertices = Physics.geometry.regularPolygonVertices( object.vertices.length, Math.max(30, distance));
							}
							world.removeBody(createdBody);
							createdBody = deserializeObject(object);
							createdBody.treatment = "static";
							world.add(createdBody);
						}
					}

					attractor.position( pos );
				}
				,'interact:release': function( pos ){
					if (createdBody != null) {
						createdBody.treatment = "dynamic";
						createdBody = null;
					}
					world.wakeUpAll();
					world.remove( attractor );
				}
			});

			// add things to the world
			var gravity = Physics.behavior('constant-acceleration');
			world.add([
				gravity
				,Physics.behavior('body-impulse-response')
				,Physics.behavior('body-collision-detection')
				,Physics.behavior('sweep-prune')
				,edgeBounce
			]);

			// subscribe to ticker to advance the simulation
			Physics.util.ticker.on(function( time ) {
				// next step
				world.step( time );
				
				// remove bodies out of 
				var bodies = world.getBodies();
				var limit = outerWidth / 2;
				if (limit > 0) {
					for(var i = 0 ; i < bodies.length ; i++) {
						var body = bodies[i];
						if (body.state.pos.x < 0-limit || body.state.pos.x > innerWidth+limit)
							world.remove(body);
					}
				}
			});
		});
    });

});
