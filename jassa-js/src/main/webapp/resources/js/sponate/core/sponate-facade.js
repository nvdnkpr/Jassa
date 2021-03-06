/**
 * An API that hides the underlying complexity.
 *
 */
(function() {

	var sparql = Jassa.sparql;
	var ns = Jassa.sponate;
	
	
	ns.Mapping = Class.create({
		initialize: function(name, pattern, tableName, patternRefs) {
			this.name = name;
			this.pattern = pattern;
			this.tableName = tableName;

			// Cached value; inferred from pattern
			this.patternRefs = patternRefs;
		},
		
		getName: function() {
			return this.name;
		},
		
		getPattern: function() {
			return this.pattern;
		},
		
		getTableName: function() {
			return this.tableName;
		},
		
		getPatternRefs: function() {
			return this.patternRefs;
		}
	});
	
	/**
	 * An easy to use API on top of the more complex system.
	 * 
	 * TODO Add example how to invoke
	 * 
	 */
	ns.StoreFacade = Class.create({
		
		/**
		 * Service and prefixes (a JSON map) are two common things that
		 * make sense to pass in to the constructor. 
		 * 
		 * 
		 */
		initialize: function(service, prefixes) {
			this.service = service;

			this.context = new ns.Context();
			this.context.getPrefixMap().addJson(prefixes);
		},
		
		/**
		 * Add a mapping specification
		 * 
		 */
		addMap: function(spec) {
			var name = spec.name;

			var jsonTemplate = spec.template;
			var from = spec.from;
		
			
			var pattern = this.context.getPatternParser().parsePattern(jsonTemplate);			

			var patternRefs = ns.PatternUtils.getRefs(pattern);

			//console.log('Parsed pattern', JSON.stringify(pattern));

			// The table name is the same as that of the mapping
			ns.ContextUtils.createTable(this.context, name, from, patternRefs);
	

			var mapping = new ns.Mapping(name, pattern, name, patternRefs);
			
			this.context.addMapping(mapping);
			
			// Create a new store object
			this.createStore(name);
			
			return this;
		},
		
		createStore: function(name) {

			if(name in this) {
				console.log('[ERROR] An attribute / store with name ' + name + ' already exists');
				throw 'Bailing out';
			}
			
			this[name] = new ns.Store(this.service, this.context, name);
		},
		
		/*
		 * Functions for access to underlying components  
		 */
		
		getSchema: function() {
			return schema;
		}
	});
	
	
})();
