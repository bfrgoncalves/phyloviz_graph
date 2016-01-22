var phyloviz_graph = require('phyloviz_bundle');
var random_profiles = require('profile_generator');

var options = {
	profile_length: 10, //default 7
	number_of_profiles: 300, //default 10
	min: 1, //default 1
	max: 4, //default 7
	distribution: 'poisson' //default "normal"
}

var input = {
	name: "datasetName",
	key:"ST",
	data_type: "profile",
	profiles: null,
	schemegenes: null,
	metadata: ['ST','From'],
	isolates: [{'ST': 1, 'From': 'Japan'}, {'ST': 2, 'From': 'Portugal'}, {'ST': 3, 'From': 'USA'}, {'ST': 4, 'From': 'Spain'}],
	newick: undefined,
	linkMethod: 'isolates',
	propertyIndex: 1 //From
}

var canvasID = 'testDiv';
var phylovizObject = {};

random_profiles(options, function(profileData){
	input.profiles = profileData.profiles;
	input.schemegenes = profileData.schemegenes;
	phyloviz_graph(input, canvasID, function(graphObject){
			phylovizObject = graphObject;
			console.log(graphObject);
	});
});


