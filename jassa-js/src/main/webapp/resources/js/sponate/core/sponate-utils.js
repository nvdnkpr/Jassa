(function() {

	// TODO Differntiate between developer utils and user utils
	// In fact, the latter should go to the facade file
	
	var sparql = Jassa.sparql; 
	var util = Jassa.util;
	var ns = Jassa.sponate;

	
	/**
	 * @Deprecated - Do not use - will be removed asap.
	 * Superseded by service.QueryExecutionFactoryHttp
	 * 
	 */
//	ns.ServiceSponateSparqlHttp = Class.create({
//		initialize: function(rawService) {
//			this.rawService = rawService;
//		},
//		
//		execSelect: function(query, options) {
//			var promise = this.rawService.execSelect(query, options);
//			
//			var result = promise.pipe(function(json) {
//				var bindings = json.results.bindings;
//
//				var tmp = bindings.map(function(b) {
//					//console.log('Talis Json' + JSON.stringify(b));
//					var bindingObj = sparql.Binding.fromTalisJson(b);
//					//console.log('Binding obj: ' + bindingObj);
//					return bindingObj;					
//				});
//				
//				var it = new ns.IteratorArray(tmp);
//				
//				//console.log()
//				
//				return it;
//			});
//			
//			return result;
//		}
//	});

	
	/**
	 * A factory for backend services.
	 * Only SPARQL supported yet.
	 * 
	 */
//	ns.ServiceUtils = {
//	
//		createSparqlHttp: function(serviceUrl, defaultGraphUris, httpArgs) {
//		
//			var rawService = new sparql.SparqlServiceHttp(serviceUrl, defaultGraphUris, httpArgs);
//			var result = new ns.ServiceSponateSparqlHttp(rawService);
//			
//			return result;
//		}	
//	};
//	

	/*
	ns.AliasedElement = Class.create({
		initialize: function(element, alias) {
			this.element = element;
			this.alias = alias;
		},
		
		getElement: function() {
			return this.element;
		},
		
		getAlias: function() {
			return this.alias;
		},
		
		toString: function() {
			return '' + this.element + ' As ' + this.alias;
		}
	});
	*/
	
	ns.JoinType = {
	        INNER_JOIN: 'inner_join',
	        LEFT_JOIN: 'left_join'
	};
	
	/**
	 * A convenient facade on top of a join builder
	 * 
	 */
	ns.JoinNode = Class.create({
		initialize: function(joinBuilder, alias) {
			this.joinBuilder = joinBuilder;
			this.alias = alias;
		},
		
		getJoinBuilder: function() {
			return this.joinBuilder;
		},
		
		getElement: function() {
			return this.joinBuilder.getElement(this.alias);
		},

		getVarMap: function() {
			return this.joinBuilder.getVarMap(this.alias);
		},
		
		// Returns all join node object 
		// joinBuilder = new joinBuilder();
		// node = joinBuilder.getRootNode();
		// node.join([?s], element, [?o]);
		//    ?s refers to the original element wrapped by the node
		//    ?o also refers to the original element of 'element'
		// 
		// joinBuilder.getRowMapper();
		// joinBuilder.getElement();
		// TODO: Result must include joinType
		getJoinNodeInfos: function() {
			var state = this.joinBuilder.getState(this.alias);
			
			var joinBuilder = this.joinBuilder;
			var result = _(state.getJoinInfos()).map(function(joinInfo) {
				var alias = joinInfo.getAlias();
			    var targetJoinNode = this.joinBuilder.getJoinNode(alias);
			   
			    var r = new ns.JoinNodeInfo(targetJoinNode, joinInfo.getJoinType());
			    return r;
			});
			
			return result;
		},

		joinAny: function(joinType, sourceJoinVars, targetElement, targetJoinVars, targetAlias) {
			var result = this.joinBuilder.addJoin(joinType, this.alias, sourceJoinVars, targetElement, targetJoinVars, targetAlias);

			return result;
		},
		
		join: function(sourceJoinVars, targetElement, targetJoinVars, targetAlias) {
		    var result = this.joinAny(ns.JoinType.INNER_JOIN, sourceJoinVars, targetElement, targetJoinVars, targetAlias);
		    return result;
		},

		leftJoin: function(sourceJoinVars, targetElement, targetJoinVars, targetAlias) {
            var result = this.joinAny(ns.JoinType.LEFT_JOIN, sourceJoinVars, targetElement, targetJoinVars, targetAlias);
            return result;
        }
	});
	
	
	
	/**
	 * 
	 * 
	 */
	ns.JoinNodeInfo = Class.create({
	    initialize: function(joinNode, joinType) {
	        this.joinNode = joinNode;
	        this.joinType = joinType;
	    },

        getJoinNode: function() {
            return this.joinNode;
        },
       
        getJoinType: function() {
            return this.joinType;
        },
       
        toString: function() {
            return this.joinType + " " + this.joinNode;
        }
	});
	
	
	/**
	 * This object just holds information
	 * about the join type of a referred alias. 
	 * 
	 */
	ns.JoinInfo = Class.create({
	   initialize: function(alias, joinType) {
	       this.alias = alias;
	       this.joinType = joinType;
	   },
	   
	   getAlias: function() {
	       return this.alias;
	   },
	   
	   getJoinType: function() {
	       return this.joinType;
	   },
	   
	   toString: function() {
	       return this.joinType + " " + this.alias;
	   }
	});

	
	ns.JoinTargetState = Class.create({
	    initialize: function(varMap, joinNode, element) {
	        this.varMap = varMap;
	        this.joinNode = joinNode;
	        this.element = element;
	        this.joinInfos = [];
	    },
	    
	    getVarMap: function() {
	        return this.varMap;
	    },
	    
	    getJoinNode: function() {
	        return this.joinNode;
	    },
	    
	    getElement: function() {
	        return this.element;
	    },
	    
	    getJoinInfos: function() {
	        return this.joinInfos;
	    }
	});
	
	/**
	 * Aliases are automatically assigned if none is given explicitly
	 * 
	 * The alias can be retrieved using
	 * joinNode.getAlias();
	 * 
	 * 
	 * a: castle
	 * 
	 * 
	 * b: owners
	 * 
	 * 
	 */
	ns.JoinBuilderElement = Class.create({
		initialize: function(rootElement, rootAlias) {

			if(rootElement == null) {
				console.log('[Error] Root element must not be null');
				throw 'Bailing out';
			}
			
			
			this.usedVarNames = [];
			this.usedVars = [];

			this.aliasGenerator = new sparql.GenSym('a');
			this.varNameGenerator = new sparql.GeneratorBlacklist(new sparql.GenSym('v'), this.usedVarNames); 
			

			this.aliasToState = {};
			this.rootAlias = rootAlias ? rootAlias : this.aliasGenerator.next(); 
			 

			var rootState = this.createTargetState(this.rootAlias, new util.HashBidiMap(), [], rootElement, []);

			this.aliasToState[this.rootAlias] = rootState;
			
			this.rootNode = rootState.getJoinNode(); //new ns.JoinNode(rootAlias);
		},

		getRootNode: function() {
			return this.rootNode;
		},

		getJoinNode: function(alias) {
			var state = this.aliasToState[alias];
			
			var result = state ? state.getJoinNode() : null;
			
			return result;
		},


		getState: function(alias) {
			return this.aliasToState[alias];
		},
	
		getElement: function(alias) {
			var state = this.aliasToState[alias];
			var result = state ? state.getElement() : null;
			return result;
		},
		
//		getElement: function(alias) {
//			return this.aliasToElement[alias];
//		},
//		
//		getJoinNode: function(alias) {
//			return this.aliasToJoinNode[alias];
//		},
//		
//		getVarMap: function(alias) {
//			return this.aliasToVarMap[alias];
//		},
		
		addVars: function(vars) {
			
			var self = this;
			_(vars).each(function(v) {
				
				var varName = v.getName();
				var isContained = _(self.usedVarNames).contains(varName);
				if(!isContained) {
					self.usedVarNames.push(varName);
					self.usedVars.push(v);
				}
			});
		},
		
		createTargetState: function(targetAlias, sourceVarMap, sourceJoinVars, targetElement, targetJoinVars) {
			var sjv = sourceJoinVars.map(function(v) {
				var rv = sourceVarMap.get(v);				
				return rv;
			});
			
			//var sourceVars = this.ge; // Based on renaming!
			var oldTargetVars = targetElement.getVarsMentioned();
			var targetVarMap = sparql.ElementUtils.createJoinVarMap(this.usedVars, oldTargetVars, sjv, targetJoinVars, this.varGenerator);
			
			var newTargetElement = sparql.ElementUtils.createRenamedElement(targetElement, targetVarMap);
			
			var newTargetVars = targetVarMap.getInverse().keyList();
			this.addVars(newTargetVars);

			
			var result = new ns.JoinNode(this, targetAlias);

			var targetState = new ns.JoinTargetState(targetVarMap, result, newTargetElement); 
//			
//			var targetState = {
//				varMap: targetVarMap,
//				joinNode: result,
//				element: newTargetElement,
//				joins: []
//			};
//
			return targetState;
		},
		


		addJoin: function(joinType, sourceAlias, sourceJoinVars, targetElement, targetJoinVars, targetAlias) {
			var sourceState = this.aliasToState[sourceAlias];
			var sourceVarMap = sourceState.getVarMap();

			if(!targetAlias) {
			    targetAlias = this.aliasGenerator.next();
			}

			var targetState = this.createTargetState(targetAlias, sourceVarMap, sourceJoinVars, targetElement, targetJoinVars);
						
			//var targetVarMap = targetState.varMap;			
			//var newTargetVars = targetVarMap.getInverse().keyList();
			
			// TODO support specification of join types (i.e. innerJoin, leftJoin)
			var joinInfo = new ns.JoinInfo(targetAlias, joinType);
			sourceState.getJoinInfos().push(joinInfo);
			//sourceState.joins.push(targetAlias);
			

			this.aliasToState[targetAlias] = targetState;
			
			var result = targetState.getJoinNode();
			return result;
		},

		
		getElementsRec: function(node) {
		    var resultElements = [];
		    
	        var element = node.getElement();
	        resultElements.push(element);

		    
		    var children = node.getJoinNodeInfos();
		    
		    var self = this;
		    _(children).each(function(child) {
	            var childNode = child.getJoinNode();
		        var childElements = self.getElementsRec(childNode);

		        var childElement = new sparql.ElementGroup(childElements);


		        var joinType = child.getJoinType();
		        switch(joinType) {
		        case ns.JoinType.LEFT_JOIN:
		            childElement = new sparql.ElementOptional(childElement);
		            break;
		        case ns.JoinType.INNER_JOIN:
		            break;
		        default:
		            console.log('[ERROR] Unsupported join type: ' + joinType);
		            throw 'Bailing out';
		        }
		        resultElements.push(childElement);
		    });
		    
		    return resultElements;
		},
		
		getElements: function() {
		    var rootNode = this.getRootNode();
		    
		    var result = this.getElementsRec(rootNode);
		    return result;
		    
			//var result = [];
			/*
			var rootNode = this.getRootNode();

			util.TreeUtils.visitDepthFirst(rootNode, ns.JoinBuilderUtils.getChildren, function(node) {
				result.push(node.getElement());
				return true;
			});
			*/
			return result;
		},
		
		getAliasToVarMap: function() {
			var result = {};
			_(this.aliasToState).each(function(state, alias) {
				result[alias] = state.varMap;
			});
			
			return result;
		}
		

//		getVarMap: function() {
//			_.each()
//		}
	});

	ns.JoinBuilderUtils = {
		getChildren: function(node) {
			return node.getJoinNodes();
		}
	}

	ns.JoinBuilderElement.create = function(rootElement, rootAlias) {
		var joinBuilder = new ns.JoinBuilderElement(rootElement, rootAlias);
		var result = joinBuilder.getRootNode();
		
		return result;
	};

	ns.fnNodeEquals = function(a, b) { return a.equals(b); };

	/*
	 * We need to map a generated var back to the alias and original var
	 * newVarToAliasVar:
	 * {?foo -> {alias: 'bar', var: 'baz'} }
	 * 
	 * We need to map and alias and a var to the generater var
	 * aliasToVarMap
	 * { bar: { baz -> ?foo } }
	 *
	 * 
	 * 
	 * 
	 */
//	ns.VarAliasMap = Class.create({
//		initialize: function() {
//			// newVarToOrig
//			this.aliasToVarMap = new ns.HashMap(ns.fnNodeEquals)
//			this.newVarToAliasVar = new ns.HashMap(ns.fnNodeEquals);
//		},
//		
//		/*
//		addVarMap: function(alias, varMap) {
//			
//		},
//		
//		put: function(origVar, alias, newVar) {
//			this.newVarToAliasVar.put(newVar, {alias: alias, v: origVar});
//			
//			var varMap = this.aliasToBinding[alias];
//			if(varMap == null) {
//				varMap = new ns.BidiHashMap();
//				this.aliasToVarMap[alias] = varMap;
//			}
//			
//			varMap.put(newVar, origVar);
//		},
//		*/
//		
//		getOrigAliasVar: function(newVar) {
//			var entry = this.newVarToAliasVar.get(newVar);
//			
//			var result = entry == null ? null : entry;
//		},
//		
//		getVarMap: function(alias) {
//		}
//	});
//	
//	
//	ns.VarAliasMap.create = function(aliasToVarMap) {
//		var newVarToAliasVar = new ns.HashMap()
//		
//	};
//	
	
	ns.JoinElement = Class.create({
		initialize: function(element, varMap) {
			this.element = element;
		}
		
	});


	ns.JoinUtils = {
		/**
		 * Create a join between two elements 
		 */
		join: function(aliasEleA, aliasEleB, joinVarsB) {
			//var aliasA = aliasEleA. 
			
			var varsA = eleA.getVarsMentioned();
			var varsB = eleB.getVarsMentioned();
			
			
		},
			
		
		
		/**
		 * This method prepares all the joins and mappings to be used for the projects
		 * 
		 * 
		 * 
		 * transient joins will be removed unless they join with something that is
		 * not transient
		 * 
		 */
		createMappingJoin: function(context, rootMapping) {
			var generator = new sparql.GenSym('a');
			var rootAlias = generator.next();

			// Map<String, MappingInfo>
			var aliasToState = {};
			
			// ListMultimap<String, JoinInfo>
			var aliasToJoins = {};
		
			
			aliasToState[rootAlias] = {
				mapping: rootMapping,
				aggs: [] // TODO The mapping's aggregators
			};
			
			var open = [a];
			
			while(open.isEmpty()) {
				var sourceAlias = open.shift();
				
				var sourceState = aliasToState[sourceAlias];
				var sourceMapping = sourceState.mapping;
				
				ns.ContextUtils.resolveMappingRefs(this.context, sourceMapping);
				
				var refs = mapping.getPatternRefs(); 

				// For each reference, if it is an immediate join, add it to the join graph
				// TODO And what if it is a lazy join??? We want to be able to batch those.
				_(refs).each(function(ref) {
					var targetMapRef = ref.getTargetMapRef();
					
					var targetAlias = generator.next();
					
					aliasToState[targetAlias] = {
						mapping: targetMapping	
					};
				
					var joins = aliasToJoins[sourceAlias];
					if(joins == null) {
						joins = [];
						aliasToJoins[sourceAlias] = joins;
					}
					
					// TODO What was the idea behind isTransient?
					// I think it was like this: If we want to fetch distinct resources based on a left join's lhs, and there is no constrain on the rhs, we can skip the join
					var join = {
						targetAlias: targetAlias,						
						isTransient: true
					};
					
					joins.push(join);
				});
				
				
				var result = {
					aliasToState: aliasToState, 
					aliasToJoins: aliasToJoins
				};
				
				return result;
			}
		}
			
	};

	
	ns.GraphItem = Class.create({
		initialize: function(graph, id) {
			this.graph = graph;
			this.id = id;
		},
		
		getGraph: function() {
			return this.graph;
		},
		
		getId: function() {
			return this.id;
		}
	});


	ns.Node = Class.create(ns.GraphItem, {
		initialize: function($super, graph, id) {
			$super(graph, id);
		},
		
		getOutgoingEdges: function() {
			var result = this.graph.getEdges(this.id);
			return result;
		}
	});

	
	ns.Edge = Class.create({
		
		initialize: function(graph, id, nodeIdFrom, nodeIdTo) {
			this.graph = graph;
			this.id = id;
			this.nodeIdFrom = nodeIdFrom;
			this.nodeIdTo = nodeIdTo;
		},
		
		getNodeFrom: function() {
			var result = this.graph.getNode(this.nodeIdFrom);
			return result;
		},
		
		getNodeTo: function() {
			var result = this.graph.getNode(this.nodeIdTo);
			return result;			
		}

	});
	

	/**
	 * Not used
	 */
	ns.Graph = Class.create({
		initialize: function(fnCreateNode, fnCreateEdge) {
			this.fnCreateNode = fnCreateNode;
			this.fnCretaeEdge = fnCreateEdge;
			
			this.idToNode = {};
			
			// {v1: {e1: data}}
			// outgoing edges
			this.nodeIdToEdgeIdToEdge = {};
			this.idToEdge = {};

			this.nextNodeId = 1;
			this.nextEdgeId = 1;
		},
		
		createNode: function(/* arguments */) {
			var nodeId = '' + (++this.nextNodeId);
			
			var tmp = Array.prototype.slice.call(arguments, 0);
			var xargs = [this, nodeId].concat(tmp);
			
			var result = this.fnCreateNode.apply(this, xargs);
			this.idToNode[nodeId] = result;
			
			return result;
		},
		
		createEdge: function(nodeIdFrom, nodeIdTo /*, arguments */) {
			var edgeId = '' + (++this.nextEdgeId);
			
			var tmp = Array.prototype.slice.call(arguments, 0);
			// TODO Maybe we should pass the nodes rather than the node ids
			var xargs = [graph, nodeIdFrom, nodeIdTo].concat(tmp);

			
			var result = this.fnEdgeNode.apply(this, xargs);
			
			var edgeIdToEdge = this.nodeIdToEdgeIdToEdge[edges];
			if(edgeIdToEdge == null) {
				edgeIdToEdge = {};
				this.nodeIdToEdgeIdToEdge = edgeIdToEdge; 
			}
			
			edgeIdToEdge[edgeId] = result;
			this.idToEdge[edgeId] = result;
			
			
			return result;
		}		
		
	});
	
	ns.NodeJoinElement = Class.create(ns.Node, {
		initialize: function($super, graph, nodeId, element, alias) {
			$super(graph, nodeId); 

			this.element = element; // TODO ElementProvider?
			this.alias = alias;
		},
		
		getElement: function() {
			return this.element;
		},
		
		getAlias: function() {
			return this.alias;
		}		
	});

	
	ns.fnCreateMappingJoinNode = function(graph, nodeId) {
		console.log('Node arguments:', arguments);
		return new ns.MappingJoinNode(graph, nodeId);
	};


	ns.fnCreateMappingEdge = function(graph, edgeId) {
		return new ns.MappingJoinEdge(graph, edgeId);
	};


	ns.JoinGraphElement = Class.create(ns.Graph, {
		initialize: function($super) {
			$super(ns.fnCreateMappingJoinNode, ns.fnCreateMappingEdge);
		}
	});
	
	
	/**
	 * This row mapper splits a single binding up into multiple ones
	 * according to how the variables are mapped by aliases.
	 * 
	 * 
	 */
	ns.RowMapperAlias = Class.create({
		initialize: function(aliasToVarMap) {
			this.aliasToVarMap = aliasToVarMap;
		},
		
		/**
		 * 
		 * Returns a map from alias to bindings
		 * e.g. { a: binding, b: binding}
		 */
		map: function(binding) {
			//this.varAliasMap
			
			var vars = binding.getVars();
			
			var result = {};
			
			_(this.aliasToVarMap).each(function(varMap, alias) {
				
				var b = new sparql.Binding();
				result[alias] = b;
				
				var newToOld = varMap.getInverse();
				var newVars = newToOld.keyList();
				
				_(newVars).each(function(newVar) {
					var oldVar = newToOld.get(newVar);
					
					var node = binding.get(newVar);
					b.put(oldVar, node);
				});
				
			});
			
			return result;
//			
//			var varAliasMap = this.varAliasMap;
//			_(vars).each(function(v) {
//				
//				var node = binding.get(v);
//				
//				var aliasVar = varAliasMap.getOrigAliasVar(v);
//				var ov = aliasVar.v;
//				var oa = aliasVar.alias;
//				
//				var resultBinding = result[oa];
//				if(resultBinding == null) {
//					resultBinding = new ns.Binding();
//					result[oa] = resultBinding;
//				}
//				
//				resultBinding.put(ov, node);
//			});
//			
//			
//			return result;
		}
	});
	

	ns.MappingJoinEdge = Class.create(ns.Edge, {
		initialize: function($super, graph, edgeId) {
			$super(graph, graph, edgeId); 
		}
	});

	
	
})();

