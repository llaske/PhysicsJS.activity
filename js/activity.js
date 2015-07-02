define(function (require) {
    var activity = require("sugar-web/activity/activity");

    // Manipulate the DOM only when it is ready.
    require(['domReady!'], function (doc) {

        // Initialize the activity
        activity.setup();
		
		// Initialize the world
		var body = document.getElementById("body");
		var innerWidth = body.offsetWidth;
		var innerHeight = body.offsetHeight;
		var toolbarHeight = 55;
		var outerWidth = 0; // Use to determine if items could disappear, could be 300;
		var init = false;
		var gravityMode = 0;
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
			document.getElementById("box-button").addEventListener('click', function () {
				dropInBody(1);
			}, true);
			document.getElementById("circle-button").addEventListener('click', function () {
				dropInBody(0);
			}, true);
				
			document.getElementById("triangle-button").addEventListener('click', function () {
				dropInBody(2);
			}, true);
			
			document.getElementById("gravity-button").addEventListener('click', function () {
				gravityMode = (gravityMode + 1)%8;
				document.getElementById("gravity-button").style.backgroundImage = "url(icons/gravity"+gravityMode+".svg)";
				var acc = {};
				switch(gravityMode) {
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
			}, true);
			
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

			function dropInBody(type){

				var body;
				var c;

				switch (type){

						// add a circle
					case 0:
						c = colors[random(0, colors.length-1)];
						body = Physics.body('circle', {
							x: innerWidth / 2
							,y: 50
							,vx: random(-5, 5)/100
							,radius: 40+random(0, 70)
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
							,x: innerWidth / 2
							,y: 50
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
							vertices: Physics.geometry.regularPolygonVertices( s, random(30, 100) )
							,x: innerWidth / 2
							,y: 50
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

				world.add( body );
			}
			
			// Save world to datastore
			function saveWorld(callback) {
				// Build bodies list
				var bodies = world.getBodies();
				var objects = [];
				for(var i = 0 ; i < bodies.length ; i++) {
					var body = bodies[i];
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
					objects.push(object);
				}
				
				// Save to datastore
				var datastoreObject = activity.getDatastoreObject();
				var jsonData = JSON.stringify({world: objects});
				datastoreObject.setDataAsText(jsonData);
				datastoreObject.save(callback);
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
						var savedObject = objects[i];
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
						var newBody = Physics.body(savedObject.type, newOptions);
						world.add(newBody);
					}
				});
			}

			// add some fun interaction
			var attractor = Physics.behavior('attractor', {
				order: 0,
				strength: 0.002
			});
			world.on({
				'interact:poke': function( pos ){
				}
				,'interact:move': function( pos ){
					attractor.position( pos );
				}
				,'interact:release': function(){
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
