// The ~updateHarmony() function is called every tick
// The harmony used by sonification functions is the pitches stored in `~chord`

~h2chordOctaves = 2;

~initHarmony2 = {
	~generateHarmonicGrid.(2);
	~h2NodeIndex = 0;
	~h2TicksFromCenter = 0;

	~h2TicksSinceChordChange = 0;
	~h2TicksPerChordChange = 16;
};


~updateHarmony2 = { |overallActivity|
	~h2TicksSinceChordChange = ~h2TicksSinceChordChange + 1;
	if(~h2TicksSinceChordChange >= ~h2TicksPerChordChange, {
		~h2TicksSinceChordChange = 0;
		~h2ChangeChord.();
		if(~h2TicksFromCenter == 0, {
			~h2TicksPerChordChange = 64;
		}, {
			~h2TicksPerChordChange = [16, 32].choose;
		});
	});
};

~h2ChangeChord = {
	var new_index = ~nodeGraph[~h2NodeIndex].next_node_index(~h2TicksFromCenter);
	if(new_index == 0, {
		~h2TicksFromCenter = 0;
	}, {
		~h2TicksFromCenter = ~h2TicksFromCenter + 2;
	});
	~h2NodeIndex = new_index;
	~chord = ~nodeGraph[~h2NodeIndex].chord.degrees();
	~chord = ~h2chordOctaves.collect{|i| ~chord + (53*i)}.flatten;
	("new chord: " + (~nodeGraph[~h2NodeIndex].chord.root % 53) + " " + ~nodeGraph[~h2NodeIndex].chord.mode.asString).postln;
};


~makeChord = { | root = 0, mode = \major |
	(
		root: root,
		mode: mode,
		list_weighted_adjacent: { | self |
			var chords = List[], weights = List[], opposite_mode = \minor;
			if(self.mode == \minor, { opposite_mode = \major });
			// 5ths with the same mode
			chords.add(~makeChord.(self.root-31, self.mode)); weights.add(4);
			chords.add(~makeChord.(self.root+31, self.mode)); weights.add(4);

			// pentamerous parallel
			chords.add(~makeChord.(self.root-31, opposite_mode)); weights.add(1);
			chords.add(~makeChord.(self.root, opposite_mode)); weights.add(0.1);
			chords.add(~makeChord.(self.root+31, opposite_mode)); weights.add(1);

			// pentamerous movement
			switch(self.mode,
				\minor, {
					chords.add(~makeChord.(self.root-17, \major)); weights.add(0.5);
					chords.add(~makeChord.(self.root+14, \major)); weights.add(0.5);
				},
				\major, {
					chords.add(~makeChord.(self.root+17, \minor)); weights.add(0.5);
					chords.add(~makeChord.(self.root-14, \minor)); weights.add(0.5);
				}
			);
			weights = weights.asArray.normalizeSum;
			[chords, weights]
		},
		adjacent_chords: { |self|
			var weighted_chords = self.list_weighted_adjacent();
			weighted_chords[0]
		},
		degrees: { | self |
			var degrees = List[];
			degrees.add(self.root % 53);
			degrees.add((self.root + 31) % 53);

			switch(self.mode,
				\minor, {
					degrees.add((self.root + 14) % 53);
				},
				\major, {
					degrees.add((self.root + 17) % 53);
				}
			);
		},
	)
};

~makeNode = { | chord = nil, index = nil |
	(
		chord: chord,
		my_index: index,
		edges: List[],
		add_edge: { |self, edge|
			self.edges.add(edge);
		},
		next_node_index: { |self, ticks_from_center|
			var weights = self.edges.collect{|edge| edge.base_weight},
			distance_weights = self.edges.collect{|edge| edge.distance_weight},
			combined_weights,
			node_indices = self.edges.collect{|edge| edge.destination};

			distance_weights = distance_weights - distance_weights.minItem; // convert to all positive
			distance_weights = distance_weights.normalizeSum;
			distance_weights = distance_weights.pow(ticks_from_center.pow(0.25)); // distance becomes more discriminant for higher ticks
			distance_weights = distance_weights.normalizeSum * ticks_from_center.pow(0.5);

			combined_weights = weights + distance_weights;
			combined_weights = combined_weights.normalizeSum; // normalizes

			// ("base: " + weights +"\ndistance_weights: " + distance_weights + "\ncombined_weights: " + combined_weights).postln;

			node_indices.wchoose(combined_weights);
		},
		get_edges_to_node: { |self|
			var edges_to_node = List[];
			self.edges.do{|self_edge|
				~nodeGraph[self_edge.destination].edges.do{|edge|
					if(edge.destination == self.my_index, {edges_to_node.add(edge);});
				};
			};
			edges_to_node
		},
	)
};

~makeEdge = { | sourceIndex, destinationIndex, base_weight |
	(
		source_index: sourceIndex,
		destination: destinationIndex,
		distance_to_center: nil, // the shortest possible distance to the center node
		base_weight: base_weight,
		distance_weight: nil, // the closeness to the center relative to other edges from the same node
	)
};

// Generate chords, edges between them and their weights
// graphDepth is how many chords away from the center in every direction to go
~generateHarmonicGrid = { | graphDepth = 3 |
	~chordList = List[];
	~nodeGraph = List[];
	// start with a center chord, generate every chord a certain depth away from that chord if it doesn't already exist
	("Starting chord generation").postln;
	~addChordToList.(~makeChord.(0, \major), graphDepth);
	("Finished chord generation").postln;
	// convert list of chord to list of nodes
	~chordList.do{ | chord, i | ~nodeGraph.add(~makeNode.(chord, i)); };
	// add edges
	("Starting calculation of edges").postln;
	~addAllEdges.(~nodeGraph[0]);
	("Finished calculating edges").postln;
	// Calculate the shortest distance back to the center for every chord
	~calculateDistanceToCenter.(~nodeGraph[0]);
	~calculateDistanceToCenterWeight.();
};

// recursively add all the chords to the graph
~addChordToList = { | chord, depth |
	var index = ~findChord.(chord), adjacent_chords = chord.adjacent_chords();
	if(index == nil, {
		~chordList.add(chord);
		index = ~chordList.size - 1;
	});

	if(depth > 0, {
		adjacent_chords.do { |adj|
			~addChordToList.(adj, depth-1);
		};
	});
};

// recursively add edges with base weights to every node
~addAllEdges = { | node |
	var temp = node.chord.list_weighted_adjacent(), adjacent_chords = temp[0], weights = temp[1];
	adjacent_chords.size.do{ |i|
		var index = ~findChord.(adjacent_chords[i]);
		if(index != nil, {
			var adjacent_node = ~nodeGraph[index];
			node.add_edge(~makeEdge.(node.my_index, index, weights[i]));
			if(adjacent_node.edges.size == 0, {
				// Add the edges for this adjacent node as well if they haven't been added before
				~addAllEdges.(adjacent_node);
			});
		});
	};
};

~findChord = { |chord|
	var index = nil, i = 0, found = false;
	while({ found == false && (i < ~chordList.size) }, {
		var i_chord = ~chordList[i];
		if((i_chord.root == chord.root)
			&& (i_chord.mode == chord.mode), {
				found = true;
				index = i;
		});
		i = i + 1;
	});

	index
};

// non-recursively go through all paths and record the shortest distance to the center for each edge
~calculateDistanceToCenter = { | start_node, start_distance = 0 |
	var nodes_to_update = List[], // [node_index, accumulated_distance]
	edges_to_start_node = start_node.get_edges_to_node();
	edges_to_start_node.do{|edge|
		var update = false;
		// this ugly thing is necessary because the second condition is evaluated even if the first is true
		if(edge.distance_to_center == nil, { update = true; }, {
			if ((start_distance + (1.0/edge.base_weight)) < edge.distance_to_center, {
				update = true;
			});
		});
		if(update, {
			edge.distance_to_center = start_distance + (1.0/edge.base_weight);
			nodes_to_update.add([edge.source_index, edge.distance_to_center]);
		});
	};
	while({nodes_to_update.size > 0 }, {
		var current = nodes_to_update.removeAt(0), node = ~nodeGraph[current[0]], accumulated_distance = current[1],
		edges_to_node = node.get_edges_to_node();
		// ("node: " + node.chord.root + " accumulated_distance: " + accumulated_distance).postln;
		// the edges we should update here are all the edges leading to this node
		edges_to_node.do{|edge|
			var update = false,
			edge_distance_weight = 1.0/edge.base_weight;
			// edge_distance_weight = 1.0;
			// this ugly thing is necessary because the second condition is evaluated even if the first is true
			if(edge.distance_to_center == nil, { update = true; }, {
				if ((accumulated_distance + edge_distance_weight) < edge.distance_to_center, {
					update = true;
				});
			});
			// ("edge to: " + ~chordList[edge.destination].root +":" + ~chordList[edge.destination].mode.asString + " update: " + update.asString + " dist: " + edge.distance_to_center + " new_distance: " + (accumulated_distance + (1.0/edge.base_weight))).postln;
			// should be set to accumulated distance, adding the base weight only whe
			if(update, {
				edge.distance_to_center = accumulated_distance + edge_distance_weight;
				// follow the edge to its destination node and go through the edges of that node
				nodes_to_update.add([edge.source_index, edge.distance_to_center]);
			});
		}
	});
};

// go through all nodes and calculate the relative distance to the center for its edges
~calculateDistanceToCenterWeight = {
	~nodeGraph.do{ |node|
		var distances = node.edges.collect{|edge| edge.distance_to_center},
		mean = distances.mean;
		node.edges.do{ |edge|
			// for weights, we want more likely edges to have a higher weight. Edges leading closer to the center have a lower distance resulting in a negative number. Therefore we need to flip the sign.
			edge.distance_weight = ((edge.distance_to_center-mean)/mean) * -1;
		};
	};
};


/*

~initHarmony2.();
(
~h2ChangeChord.();
~chord.postln;
~h2TicksFromCenter.postln;
~launchChord.(~chord, 1);
)
~addChordToList.(~makeChord.(0, \major), 2);

~chordList.size
~nodeGraph.size
n = ~makeNode.(~makeChord.(), 5);
~findChord.(~makeChord.(9));
~nodeGraph[0]
~nodeGraph[0].get_edges_to_node()
~nodeGraph[1].chord.root
~nodeGraph[2].chord.root
~nodeGraph[3].chord.root
~nodeGraph[4].chord.root
~nodeGraph[5].chord.root
~nodeGraph[8].chord.root
~nodeGraph[9].edges

(
~nodeGraph[0].edges.do {|edge| (">"+edge.destination + ": " + edge.distance_to_center + " dist w: " + edge.distance_weight).postln };
)
~nodeGraph[8].edges.do {|edge| (">"+ ~chordList[edge.destination].root +":" + ~chordList[edge.destination].mode.asString + ": " + edge.distance_to_center).postln };
~nodeGraph[8].edges.do {|edge| (">"+ ~chordList[edge.destination].root +":" + ~chordList[edge.destination].mode.asString + ": " + edge.distance_weight).postln };



(
if(true || ("print".postln), {true}, {false});
)

(
w = [-4.0, 3.0, 2.3, -0.5];
(w - w.minItem).normalizeSum
)
(
var distances = [0.5, 1.0, 2.0, 3.4],
mean = distances.mean;
(distances-mean)/mean
)

*/