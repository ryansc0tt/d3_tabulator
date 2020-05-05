import d3_tabulator from './module/d3_tabulator.js';

// data file
const filenames = ['data/Brooklyn_Dog_Licensing_Dataset_2018.csv'];

// tabulator obj
const tabulator = new d3_tabulator();

// table view
const view = {
	name: 'brooklyn_dogs',
	filename: filenames[0],
	title: 'Dogs licensed in Brooklyn, NY in 2018',
	view_cols: {
		'AnimalName': 'Name',
		'AnimalGender': 'Gender',
		'AnimalBirthMonth': 'Born in',
		'BreedName': 'Breed',
		'ZipCode': 'Zip Code',
		'LicenseIssuedDate': 'License issued',
		'LicenseExpiredDate': 'License expires'
	},
	round_cols: {},
	sort_cols: {
		'AnimalName': true,
		'AnimalGender': false,
		'AnimalBirthMonth': true,
		'BreedName': true,
		'ZipCode': true,
		'LicenseIssuedDate': true,
		'LicenseExpiredDate': true
	},
	filter_cols: {
		'AnimalName': true,
		'AnimalGender': true,
		'AnimalBirthMonth': true,
		'BreedName': true,
		'ZipCode': true,
		'LicenseIssuedDate': false,
		'LicenseExpiredDate': false
	}
}

// append loading message
$('body').append($('<div>').append($('<p>').text('loading...')));

// load data
tabulator.load_data(filenames).then(() => {

	// create view
	tabulator.create_view(view.name, view.filename, view.title, view.view_cols,
			view.round_cols, view.sort_cols, view.filter_cols);
	
	// tabulate view
	let table = tabulator.tabulate_view('brooklyn_dogs');

	// ! TODO: NEED TO FIX BUG HERE BEFORE FINISHING SAMPLE - FILTER IS FILTERING BY WRONG COL
	
	// append to document
	$('body div').append(table.node());

	// remove loading message
	$('body div p').remove();

});