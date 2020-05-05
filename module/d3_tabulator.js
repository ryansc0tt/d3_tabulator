/**
* @module d3_tabulator
*/

// TODO later: import only required modules from d3 here

/**
* Module functionality is represented by the [d3_tabulator]{@link d3_tabulator.d3_tabulator} class.
* Generates a simple interactive table view from D3-compatible data files.
* Requires: D3.js v5+ ({@link https://d3js.org}).
*/
export default class d3_tabulator { 

	constructor() {

		/**
	     * Table views array.
	     * @private
	     */
		this._table_views = Array(); // table views array

		/**
	     * Table data container.
	     * @private
	     */
		this._table_data = Array();

		/**
	     * Filterable columns object for auto-linking between views.
	     * Represented as {'col_name': ['view_names'...]}.
	     * @private
	     */
		this._filterable_cols = {};

		/**
	     * Callback for when a table view is internally changed
	     * (i.e. sorted, filtered, or replaced with a new view).
	     * @param {Object} table - The D3-selected table to filter.
	     * @private
	     */
		this._on_table_change = function(table){};
		
	}

	/**
     * Filters a table view based on D3-bound data, via 'visiblity' style of rows.
     * Invokes [_on_table_change()]{@link d3_tabulator._on_table_change} callback function.
     * @param {Object} table - The D3-selected table to filter.
     * @param {Object} view_filter - Object containing properties for filtering.
     * @param {string} view_filter.col_name - String corresponding to the name of the column to filter.
     * @param {*} view_filter.value - The value to filter by.
     * @private
     */
	_filter_table(table, view_filter) {
		// TODO later: will want to be able to clear filtering in-table, and visualize better in table (prob in header). correspond design for this with possibility of filter-in-place.

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
		this._on_table_change(table);
	
	}

	/**
     * Sorts a table view based on D3-bound data, indicating ▲/▼ in header text.
     * Invokes [_on_table_change()]{@link d3_tabulator._on_table_change} callback function.
     * @param {Object} table - The D3-selected table to filter.
     * @param {string} col_name - String matching the name of the column to sort.
     * @private
     */
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

	/**
     * Enters and updates table headers based on D3-bound data. 
     * @param {Object} header_row - The D3-selected tr to render headers into.
     * @param {Object[]} col_heads - Headers metadata for this view as defined in
     * [tabulate_view()]{@link d3_tabulator.tabulate_view}.
     * @private
     */
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

	/**
     * Enters and appends table rows based on D3-bound data. 
     * @param {Object} data_rows - The D3-selected tr(s) to render cells into.
     * @param {Object[]} col_cells - Cells metadata for this view as defined in
     * [tabulate_view()]{@link d3_tabulator.tabulate_view}.
     * @private
     */
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
	
				col_cell.value = col_cell.text = t[i].innerText;
				
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

	/**
     * Replaces given table node with a new table view.
     * @param {Object} table - The D3-selected table to replace.
     * @param {string} view_name - String matching the name of the new table view.
     * @param {Object=} view_filter - Object containing properties for filtering.
     * @param {string} view_filter.col_name - String corresponding to the name of the column to filter.
     * @param {*} view_filter.value - The value to filter by.
     * @private
     */
	_replace_table(table, view_name, view_filter={}) {
		let new_table = this.tabulate_view(view_name, view_filter);
		table.node().replaceWith(new_table.node());
		this._on_table_change(new_table);
	}

	/**
     * Creates a new table view.
     * @param {string} view_name - The name of the new table view.
     * @param {string} data_filename - The data file on which to base the new table view.
     * @param {string} view_title - A title for the new table view.
     * @param {Object.<string, string>=} view_cols - Object representing columns to be included in the
     * new table view as {'name': 'header'}.
     * If no value is passed, default columns based on the data file will be used.
     * @param {Object.<string, number>=} round_cols - Object representing columns to round in the new
     * table view as {'name': precision}.
     * @param {Object.<string, boolean>=} sort_cols - Object representing columns to be sortable in the
     * new table view as {'name': true|false}.
     * By default, all columns will be sortable.
     * @param {Object<string, boolean>=} filter_cols - Object representing columns to be filterable in
     * the new table view as {'name': true|false}.
     * By default, columns are not filterable.
     */
	create_view(view_name, data_filename, view_title, view_cols={}, round_cols={},
		sort_cols={}, filter_cols={}) {

		// TODO LATER: prob pass in view and round column objects as props instead

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

	/**
     * Uses D3 to load data files, and creates default views.
     * @param {str[]} from_filenames - List of data files to load.
     * @return {Promise} A Promise that resolves once all files are successfully loaded.
     */	
	load_data(from_filenames) {

		// TODO LATER: accept either single filenames argument or array if possible	
		// TODO LATER: pop already existing views and data for this file (i.e. re-load data if requested)

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

	/**
     * Sets the callback function for when a table view is internally changed
     * (i.e. sorted, filtered, or replaced witha  new view).
     * @param cbk {function} - Callback function.
     */	
	set_on_table_change(cbk) {
		this._on_table_change = cbk;
	}

	/**
     * Tabulates and returns a table view as a D3 selection.
     * @param {string} view_name - String matching the name of the table view to tabulate,
     * as defined via [create_view()]{@link d3_tabulator.create_view}.
     * @param {Object=} view_filter - Object containing properties for filtering.
     * @param {string} view_filter.col_name - String corresponding to the name of the column to filter.
     * @param {*} view_filter.value - The value to filter by.
     * @return {Object} The D3-selected table.
     */
	tabulate_view(view_name, view_filter={}) {

		// filter table view by name
		let table_view = this._table_views.filter(
			filter_obj_by_val('viewname', view_name))[0];
		
		if (table_view != null ) {

			// filter table data by filename
			let table_data = this._table_data.filter(
				filter_obj_by_val('filename', table_view.filename))[0].data;

			// TODO later: define format for header and cell metadata outside of class

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

/* Functions representing common data structures used in d3_tabulator */

/**
 * A container for data loaded from filename.
 * @param {string} filename - String containing the name of the data file.
 * @param {Array.<*>} data - Array of table data.
 * @protected
 */
function table_data (filename, data) {
	this.filename = filename;
	this.data = data;
}

/**
 * Represents a table view
 * @param {string} viewname - String containing the name of the view.
 * @param {string} filename - String containing the name of the corresponding data file.
 * @param {string} title - The title of the view, as displayed in the table caption.
 * @param {Array.<Object>=} cols - Array of [view_col()]{@link d3_tabulator.view_col} objects representing columns in the table view.
 * @protected
 */
function table_view(viewname, filename, title, cols=[]) {
	this.viewname = viewname;
	this.filename = filename;
	this.title = title;
	this.cols = cols;
}

/**
 * Represents a column within a table view.
 * @param {string} name - String containing the name of the column.
 * @param {string} head - The header for the column, as displayed in the corresponding th.
 * @param {boolean=} is_numeric  - Whether the column represents a numeric value in the table data.
 * @param {number=} round - The precision to which to round values in the table view.
 * Values are not rounded by default.
 * @param {boolean=} sortable - Whether the column should be sortable in the table view.
 * @param {boolean=} filterable - Whether the table view can be filtered by this column.
 * @protected
 */
function view_col(name, head, is_numeric=null, round=null, sortable=true, filterable=false) {
	this.name = name;
	this.head = head;
	this.is_numeric = is_numeric;
	this.round = round;
	this.sortable = sortable;
	this.filterable = filterable;
}

/* Utility functions used in d3_tabulator */

/**
 * Assigns a property of objects with a given 'name,' given a collection of {obj.name: value} pairs.
 * @param {Object[]} objs - List containing the objects to update.
 * @param {string} property - The object property (key value) to update.
 * @param {Object<string, *>} list - The collection of {obj.name: value} pairs.
 * @protected
 */
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

/**
 * Simply maps the given {filename} to D3 load functions.
 * @param {string} filename - The filename to be loaded.
 * @return {function} The compatible D3 load function to use.
 * @protected
 */
const d3_load_function = (filename) => {
	switch(filename.split('.').pop()) { // by file ext
		case 'csv': return d3.csv;
		case 'json': return d3.json;
		case 'tsv': return d3.tsv;
		case 'xml': return d3.xml;
		default: return null;
	}
}

/**
 * Returns a simple filter for an object by obj[{key}] == {val}.
 * @param {string} key - The key to filter by.
 * @param {*} val - The value to filter by.
 * @return {function} The resulting filter function.
 * @protected
 */
const filter_obj_by_val = (key, val) => {
	return (obj) => { if (obj[key] == val) return obj; }
}

/**
 * Returns a simple filter for an object by obj[{key}] is in the given list.
 * @param {Array.<*>} list - The list of values to filter by.
 * @param {string} key - The key to filter by.
 * @return {function} The resulting filter function.
 * @protected
 */
const filter_obj_by_list = (list, key) => {
	return (obj) => { if (list.includes(obj[key])) return obj; }
}

/* TODO FOR README:
include a view vs table illustration
A standalone ES6-native module based on D3.js. Useful for..."
*/