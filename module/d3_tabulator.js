// TODO: reorganize as node project (just using npm to utilize jsdoc)

export default class d3_tabulator { 

	_table_views = Array(); // table views array
	_table_data = Array();  // table data container

	_filterable_cols = {}; // filterable column names: [views] for auto-linking between views

	_on_table_change = function(table){}; // callback for when table is internally changed

	// TODO: DOC for jsdoc
	// TODO later: will want to be able to clear filtering in-table, and visualize better in table (prob in header). correspond design for this with possibility of filter-in-place.
	_filter_table(table, view_filter) {

		// get table rows w/ data
		let table_rows = table.select('tbody').selectAll('tr');
		
		// collapse rows outside of filter
		table_rows.filter((d) => {
			return d[view_filter.col_name] != view_filter.value;
		})
		.style('visibility', 'collapse');

		// add filter value to title
		let table_caption = table.select('caption').node();
		table_caption.innerText = `${table_caption.innerText}: ${view_filter.value}`;

		// invoke callback
		this._on_table_change(table); // invoke callback
	
	}

	// TODO: DOC for jsdoc
	_on_table_sort(table, col_name) {

		// select header row 
		let header_row = table.select('thead').select('tr');

		// col headers w/ data
		let row_headers = header_row.selectAll('th')

		// sort col header
		let col_header = row_headers.filter((col_head) => {
			return col_head.name == col_name;
		});

		if (col_header != null) {

			let col_sorted_asc = col_header.data()[0].sorted_asc; // sorted flag

			if (col_sorted_asc) {

				// perform desc sort
				table.select('tbody').selectAll('tr').sort(function(a, b) {
					return d3.descending(a[col_name], b[col_name]);
				});

				col_sorted_asc = false;

			}
			else {

				// perform asc sort
				table.select('tbody').selectAll('tr').sort(function(a, b) {
					return d3.ascending(a[col_name], b[col_name]);
				});

				col_sorted_asc = true;

			}

			// re-map all col header metadata
			let col_heads = row_headers.data().map((col_head) => {
				if (col_head.name == col_name) {
					col_head.sorted_asc = col_sorted_asc;
					if (col_sorted_asc) {
						col_head.text = `${col_head.head} \u25b2`;
					}
					else {
						col_head.text = `${col_head.head} \u25bc`;
					}
				}
				else {
					col_head.sorted_asc = null;
					col_head.text = `${col_head.head}`;
				}
				return col_head;
			});

			// re-render header
			this._render_table_head(header_row, col_heads);

		}

		this._on_table_change(table); // invoke callback

	}

	// TODO: DOC for jsdoc
	// "enter and update table header"
	_render_table_head(header_row, col_heads) {

		// join header data
		let thead_data = header_row.selectAll('th').data(col_heads);
		
		// append th on enter
		let thead_enter = thead_data.enter().append('th');

		// set contents on enter/update
		let thead_update = thead_enter.merge(thead_data)

		// set text
		thead_update
		.html('') // reset contents
		.text((col_head) => {
			return col_head.text;
		});
		
		// populate sortable headers
		thead_update.filter(filter_obj_by_val('sortable', true))
		.html('') // reset contents
		.append('a')
			.on('click', (col_head) => {

				// select <table> from <tr> 
				let table = d3.select(header_row.node().parentNode.parentNode);

				// perform sort
				this._on_table_sort(table, col_head.name);

			})
			.attr('href', '#')
			.text((col_head) => {
				return col_head.text; // set text
			})

	}

	// TODO: DOC for jsdoc
	// "enter and update data rows"
	_render_table_data(data_rows, col_cells) {

		data_rows.each((d, i, rows) => {

			// join data on each row...
			let trow_data = d3.select(rows[i]).selectAll('td').data((row) => {

				// ...mapped to columns
				return col_cells.map((col_cell) => {

					// set value from data
					col_cell.value = row[col_cell.col_name];

					// format number
					if (col_cell.round != null) {
						col_cell.text = col_cell.value.toFixed(col_cell.round);
					}
					else {
						col_cell.text = String(col_cell.value);
					}

					return col_cell;
				
				});

			});

			// append td on enter
			let trow_enter = trow_data.enter().append('td');

			// set text
			trow_enter.text((col_cell) => {
				return col_cell.text;
			});

			// populate links to filterable columns
			let filterable_col_list = Object.keys(this._filterable_cols);

			trow_enter.filter(filter_obj_by_list(filterable_col_list, 'col_name'))
			.html('') // reset contents
			.append('a')
			.on('click', (col_cell, i, t) => {

				// ! TODO later: try to figure out again why the wrong data (last in data_rows) is bound here by the time onclick gets invoked.
				// ! Re-setting based on text in td for now.
				col_cell.value = col_cell.text = t[0].innerText;
				
				// select <table> from <tr> 
				let table = d3.select(data_rows.node().parentNode.parentNode);

				// replace table
				// TODO later: create a bacis pop-up/hover UI to select which view to click to, instead of just using [0]		
				this._replace_table(table, this._filterable_cols[col_cell.col_name][0], col_cell);
				
			})
			.attr('href', '#')
			.text((col_cell) => {
				return col_cell.text; // set text
			});

		});

	}

	// TODO: DOC for jsdoc
	// replace table node with a new view
	_replace_table(table, view_name, view_filter={}) {
		let new_table = this.tabulate_view(view_name, view_filter);
		table.node().replaceWith(new_table.node());
		this._on_table_change(new_table);
	}

	// TODO: DOC for jsdoc
	// TODO LATER: prob pass in view and round column objects as props instead
	create_view(view_name, data_filename, view_title, view_cols={}, round_cols={},
		sort_cols={}, filter_cols={}) {

		// defauls cols based on table data
		let default_cols = this._table_views.filter(
			filter_obj_by_val('filename', data_filename))[0].cols;

		// init new view
		let new_view = new table_view(view_name, data_filename, view_title); 

		if (Object.keys(view_cols).length > 0) {

			// assign col headers for table using defaults as baseline
			default_cols.forEach((col) => {
				if (Object.keys(view_cols).includes(col.name)) {
					new_view.cols.push(
						new view_col(col.name, view_cols[col.name], col.is_numeric,
							view_col.round, view_col.sortable, view_col.filterable)
					);
				}
			});

		}
		else {

			// use default cols if none specified
			new_view.cols = default_cols.map(a => ({...a})); // spread objects in array to copy

		}

		// assign cols to round in table
		assign_prop_by_name(new_view.cols, 'round', round_cols);


		// assign sortable cols in table
		assign_prop_by_name(new_view.cols, 'sortable', sort_cols);

		// assign filterable cols in table...
		assign_prop_by_name(new_view.cols, 'filterable', filter_cols);

		//... and member array
		new_view.cols.filter((col) => {
			return col.filterable;
		}).forEach((col) => {
			if (!Object.keys(this._filterable_cols).includes(col.name)) {
					this._filterable_cols[col.name] = [new_view.viewname];
				}
				else {
					this._filterable_cols[col.name].push(new_view.viewname);
				}
		});

		// push new view to array
		this._table_views.push(new_view);

	}

	// TODO: DOC for jsdoc
	// TODO LATER: accept either single filenames argument or array if possible	
	// TODO LATER: pop already existing views and data for this file (i.e. re-load data if requested)	
	load_data(from_filenames) {

		// promise - pending data loaded from all files
		return new Promise((resolve, reject) => {

			from_filenames.forEach(filename => {

				let load_function = d3_load_function(filename);

				if(load_function != null) {

					// load data from file
					load_function(filename).then(d => {
						
						// infer default view metadata from first row
						let cols = Object.keys(d[0]).map((key) => {
							return new view_col(key, key, !isNaN(d[0][key]));
						});

						// convert numeric cols
						cols.forEach((col) => {
							if (col.is_numeric) {
								d.map((row) => {
									row[col.name] = +row[col.name];
								});
							};
						});

						// push default view to array
						this._table_views.push(
							new table_view(filename, filename, filename, cols));

						// push data to container
						this._table_data.push(new table_data(filename, d));

						// resolve if all files are loaded
						if (from_filenames.every((from_file) => {
							return this._table_views.map((view) => {
								return view.filename;
							}).includes(from_file)
						})) {
							resolve();
						}						

					}).catch((reason) => {
						reject(`Error while loading '${filename}'`);
					});
				}
				else {
					reject(`No load function for '${filename}'`);
				}

			});

		});

	}

	// TODO: DOC for jsdoc
	// sets callback for table change(called on sort, filter, or replace with new view)
	set_on_table_change(cbk) {
		this._on_table_change = cbk;
	}

	// TODO: DOC for jsdoc
	// tabulates and returns D3 object
	// optional [view_filter] has .value and .col_name properties, based on col_cell format
	tabulate_view(view_name, view_filter={}) {

		// filter table view by name
		let table_view = this._table_views.filter(
			filter_obj_by_val('viewname', view_name))[0];
		
		if (table_view != null ) {

			// filter table data by filename
			let table_data = this._table_data.filter(
				filter_obj_by_val('filename', table_view.filename))[0].data;

			//get initial header metadata
			let col_heads = table_view.cols.map((col) => {
				return {
					name: col.name,
					head: col.head,
					text: String(col.head),
					sortable: col.sortable,
					sorted_asc: null // default sorted flag
				};
			});

			//get initial cell metadata by column
			let col_cells = table_view.cols.map((col) => {
				return {
					col_name: col.name,
					value: null,
					text: '',
					round: col.round
				};
			});

			// create table, bind view data for easy reference
			let table = d3.select(document.createElement('table'));
			table.data([table_view]);

			// append title text
			table.append('caption').text(table_view.title);

			// append header tr
			let thead_row = table.append('thead').append('tr');

			// render headers
			this._render_table_head(thead_row, col_heads);

			// append table body
			let	tbody = table.append('tbody');

			// append a tr for each table data row
			let trow_data = tbody.selectAll('tr').data(table_data);
			let trow_enter = trow_data.enter().append('tr');
			
			// set default visibility (for filtering)
			trow_enter.style('visibility', 'visible');

			// render cells
			this._render_table_data(trow_enter, col_cells);

			// filter view as requested
			if (Object.keys(view_filter).length > 0) {
				this._filter_table(table, view_filter);				
			}
			
			return table;

		 }

	}

}

// TODO: DOC for jsdoc
// functions representing common data structures used in d3_tabulator
// ----------

// TODO: DOC for jsdoc
// a container for data loaded from [filename]
function table_data (filename, data) {
	this.filename = filename;
	this.data = data;
}

// TODO: DOC for jsdoc
// represents a table view
function table_view(viewname, filename, title, cols=[]) {
	this.viewname = viewname;
	this.filename = filename;
	this.title = title;
	this.cols = cols;
}

// TODO: DOC for jsdoc
// represents a column within a table view
function view_col(name, head, is_numeric=null, round=null, sortable=true, filterable=false) {
	this.name = name;
	this.head = head;
	this.is_numeric = is_numeric;
	this.round = round;
	this.sortable = sortable;
	this.filterable = filterable;
}

// TODO: DOC for jsdoc
// Utility functions used in d3_tabulator
// ----------

// TODO: DOC for jsdoc
// assign property to view columns by list of {name: value}
const assign_prop_by_name = (objs, property, list) => {

	let names = Object.keys(list);

	if (names.length > 0) {
		objs.forEach((obj) => {
			if (names.includes(obj.name)) {
				obj[property] = list[obj.name];
			}
		});
	}

}

// TODO: DOC for jsdoc
// simply maps given [filename] to d3 load functions
const d3_load_function = (filename) => {
	switch(filename.split('.').pop()) { // by file ext
		case 'csv': return d3.csv;
		case 'json': return d3.json;
		case 'tsv': return d3.tsv;
		case 'xml': return d3.xml;
		default: return null;
	}
}

// TODO: DOC for jsdoc
// returns a simple filter for an object by [key] == [val]
const filter_obj_by_val = (key, val) => {
	return (obj) => { if (obj[key] == val) return obj; }
}

// TODO: DOC for jsdoc
// returns a simple filter for an object if value of obj.key is in given list
const filter_obj_by_list = (list, key) => {
	return (obj) => { if (list.includes(obj[key])) return obj; }
}


/* TODO FOR README:
include a view vs table illustration
note: "a standalone ES6-native module based on D3.js"; "useful for generating a simple interactive table from D3-compatible data files."
*/