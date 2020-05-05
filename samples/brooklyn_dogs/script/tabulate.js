import d3_tabulator from './module/min/d3_tabulator.min.js';

// data file
const filenames = ['data/Brooklyn_Dog_Licensing_Dataset_2018.csv'];

// tabulator obj
const tabulator = new d3_tabulator();

// append loading message
$('body').append($('<div>').append($('<p>').text('loading...')));

// load data
tabulator.load_data(filenames).then(() => {
	
	// tabulate default view (based on filename)
	let table = tabulator.tabulate_view(filenames[0]);
	
	// append to document
	$('body div').append(table.node());

	// remove loading message
	$('body div p').remove();

});