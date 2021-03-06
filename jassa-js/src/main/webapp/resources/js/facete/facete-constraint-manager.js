(function() {

	var util = Jassa.util;
	
	var ns = Jassa.facete;
	
	
	ns.createDefaultConstraintElementFactories = function() {
		var result = new util.ObjectMap();
	
		result.put("exist", new ns.ConstraintElementFactoryExist());
		result.put("equal", new ns.ConstraintElementFactoryEqual());
		//registry.put("range", new facete.ConstaintElementFactoryRange());		
		result.put("bbox", new ns.ConstraintElementFactoryBBoxRange());

		
		return result;
	};
	

	
	/**
	 * A constraint manager is a container for ConstraintSpec objects.
	 * 
	 * @param cefRegistry A Map<String, ConstraintElementFactory>
	 */
	ns.ConstraintManager = Class.create({
		initialize: function(cefRegistry) {
			
			if(!cefRegistry) {
				cefRegistry = ns.createDefaultConstraintElementFactories(); 
			}
			
			this.cefRegistry = cefRegistry;
			this.constraints = [];
		},
		
		getCefRegistry: function() {
			return this.cefRegistry;
		},
		
		/**
		 * Yields all constraints having at least one
		 * variable bound to the exact path
		 * 
		 * Note: In general, a constraint may make use of multiple paths
		 */
		getConstraintsByPath: function(path) {
			var result = [];
			
			var constraints = this.constraints;
			
			for(var i = 0; i < constraints.length; ++i) {
				var constraints = constraints[i];
				
				var paths = constraint.getDeclaredPaths();
				
				var isPath = _.some(paths, function(p) {
					var tmp = p.equals(path);
					return tmp;
				});
				
				if(isPath) {
					result.push(constraint);
				}
			}
			
			return result;
		},
		

		getConstrainedSteps: function(path) {
			//console.log("getConstrainedSteps: ", path);
			//checkNotNull(path);
			
			var tmp = [];
			
			var steps = path.getSteps();
			var constraints = this.constraints;
			
			for(var i = 0; i < constraints.length; ++i) {
				var constraint = constraints[i];
				//console.log("  Constraint: " + constraint);

				var paths = constraint.getDeclaredPaths();
				//console.log("    Paths: " + paths.length + " - " + paths);
				
				for(var j = 0; j < paths.length; ++j) {
					var p = paths[j];
					var pSteps = p.getSteps();
					var delta = pSteps.length - steps.length; 
					
					//console.log("      Compare: " + delta, p, path);
					
					var startsWith = p.startsWith(path);
					//console.log("      Startswith: " + startsWith);
					if(delta == 1 && startsWith) {
						var step = pSteps[pSteps.length - 1];
						tmp.push(step);
					}
				}
			}
			
			var result = _.uniq(tmp, function(step) { return "" + step; });
			
			//console.log("Constraint result", constraints.length, result.length);
			
			return result;
		},
			
		addConstraint: function(constraint) {
			this.constraints.push(constraint);
		},
		
		removeConstraint: function() {
			// TODO implement
		},
		
//		createElement: function(facetNode, excludePath) {
//			console.log("Should not be invoked");
//			
//			var elements = this.createElements(facetNode, excludePath);
//			var result;
//			if(elements.length === 1) {
//				result = elements[0];
//			} else {
//				result = new sparql.ElementGroup(elements);
//			}
//			
//			return result;
//		},
		
		createElements: function(facetNode, excludePath) {
			//var triples = [];
			var elements = [];
			
			
			var pathToExprs = {};
			
			var self = this;

			_.each(this.constraints, function(constraint) {
				var paths = constraint.getDeclaredPaths();
				
				var pathId = _.reduce(
						paths,
						function(memo, path) {
							return memo + " " + path;
						},
						""
				);

				// Check if any of the paths is excluded
				if(excludePath) {
					var skip = _.some(paths, function(path) {
						//console.log("Path.equals", excludePath, path);
						
						var tmp = excludePath.equals(path);
						return tmp;
					});

					if(skip) {
						return;
					}
				}
				
				
				_.each(paths, function(path) {
					
					//if(path.equals(excludePath)) {
						// TODO Exclude only works if there is only a single path
						// Or more generally, if all paths were excluded...
						// At least that somehow seems to make sense
					//}
					
					var fn = facetNode.forPath(path);
					
					//console.log("FNSTATE", fn);
					
					var tmpElements = fn.getElements();
					elements.push.apply(elements, tmpElements);
				});
				
				var constraintName = constraint.getName();
				var cef = self.cefRegistry.get(constraintName);
				if(!cef) {
					throw "No constraintElementFactory registered for " + constraintName;
				}
				
				var ci = cef.createElementsAndExprs(facetNode, constraint);
				
				//var ci = constraint.instanciate(facetNode);
				var ciElements = ci.getElements();
				var ciExprs = ci.getExprs();
				
				if(ciElements) {
					elements.push.apply(elements, ciElements);
				}				
				
				if(ciExprs && ciExprs.length > 0) {
				
					var exprs = pathToExprs[pathId];
					if(!exprs) {
						exprs = [];
						pathToExprs[pathId] = exprs;
					}
					
					var andExpr = sparql.andify(ciExprs);
					exprs.push(andExpr);
				}				
			});

			_.each(pathToExprs, function(exprs) {
				var orExpr = sparql.orify(exprs);
				var element = new sparql.ElementFilter([orExpr]);

				//console.log("andExprs" +  element);

				elements.push(element);
			});

			//console.log("pathToExprs", pathToExprs);

			//console.log("[ConstraintManager::createElements]", elements);
			
			return elements;
		}
		
	});

})();



/**
 * An expressions whose variables are expressed in terms
 * of paths.
 * 
 * TODO What if we constrained a geo resource to a bounding box?
 * If the instance function accepted a facet node,
 * then a constraint could use it to create new triples (e.g. geoResource lat/long ?var)
 * 
 * On the other hand, as this essentially places constraints at
 * different paths (i.e. range constraints on lat/long paths),
 * so actually, we could expand this constraints to sub-constraints,
 * resulting in a hierarchy of constraints, and also resulting
 * in another layer of complexity...
 * 
 * 
 * 
 * 
 * Constraint.intstanciate(facetNode
 * 
 * 
 * @param expr
 * @param varToPath
 * @returns {ns.Constraint}
 */
//ns.ConstraintExpr = Class.create({
//	initialize: function(expr, varToPath)  {
//		this.expr = expr;
//		this.varToPath = varToPath;
//	},
//
//	/*
//	 * Get the paths used by this expression
//	 */
//	getPaths: function() {
//		var result = _.values(this.varToPath);
//		return result;
//	},
//		
//	getId: function() {
//		
//	},
//	
//	toString: function() {
//		return this.getId();
//	},
//	
//	/**
//	 * Returns an array of elements.
//	 * 
//	 * Change: It now returns an element and a set of expressions.
//	 * The expressions get ORed when on the same path
//	 * 
//	 * Replaces the variables in the expressions
//	 * with those for the paths.
//	 * 
//	 * 
//	 * Usually the facetNode should be the root node.
//	 * 
//	 * @param varNode
//	 */
//	instanciate: function(facetNode) {
//		var varMap = {};
//		
//		_.each(this.varToPath, function(path, varName) {
//			var targetFacetNode = facetNode.forPath(path);
//			var v = targetFacetNode.getVariable();
//			varMap[varName] = v;
//		});
//		
//		var fnSubstitute = function(node) {
//			//console.log("Node is", node);
//			if(node.isVar()) {
//				var varName = node.getValue();
//				var v = varMap[varName];
//				if(v) {
//					return v;
//				}
//			}
//			return node;
//		};
//		
//		//console.log("Substituting in ", this.expr);
//		var tmpExpr = this.expr.copySubstitute(fnSubstitute);
//		
//		var result = {
//				elements: [], //element],
//				exprs: [tmpExpr]
//		};
//		
//		/*
//		var result = [element];
//		*/
//		
//		return result;
//		//substitute
//	}
//});
