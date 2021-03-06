import * as types from './constants';
import { getTableState, getRemoteProvider, getPagesLoaded, getUpdatedSortDirection } from './util/store-util';
import { GriddleActions } from 'griddle-core';
import Immutable from 'immutable';

function remoteAction(actionType, response) {
  return {
    type: actionType,
    currentPage: response.page,
    maxPage: response.maxPage,
    totalCount: response.totalCount,
    data: Immutable.fromJS(response.data)
  };
}

export function remoteError(err, response) {
  // TODO: Include a little more information about this error.

  return {
    type: types.GRIDDLE_REMOTE_ERROR
  };
}

export function makeRequest(remoteProvider, tableState, successDispatch) {
  return dispatch => {
    // Indicate that our AJAX request is starting.
    dispatch(startLoading());

    if (!remoteProvider || !remoteProvider.makeRequest) {
      console.error('No provider has been configured. Please ensure that a provider has been passed in to the griddle-remote-plugin.');
    }

    // Make the request.
    dispatch(remoteProvider.makeRequest(tableState, successDispatch, remoteError));
  }
}

export function startLoading() {
  return {
    type: types.GRIDDLE_START_LOADING
  };
}

export function loadData(data) {
  return {
    type: types.GRIDDLE_LOADED_DATA,
    data
  };
}

export function initializeGrid(store, properties) {
  return dispatch => {
    // Initialize the grid.
    dispatch(GriddleActions.initializeGrid(properties));

    // Load the first page of results.
    dispatch(loadPage(store, 1));
  }
}

export function filterData(store, filter) {
  const tableState = {
    ...getTableState(store),
    page: 1,
    filter
  };
  const remoteProvider = getRemoteProvider(store);

  return makeRequest(remoteProvider, tableState, (response) => {
    return filterDataRemoteHandler(response, filter);
  });
}

export function filterDataRemoteHandler(response, filter) {
  return dispatch => {
    // Append the data.
    dispatch(remoteAction(types.GRIDDLE_REMOTE_REPLACE_DATA, response));

    // Execute the filter.
    dispatch(GriddleActions.filterData(filter));

    // Indicate that we're done loading.
    dispatch({ type: types.GRIDDLE_STOP_LOADING });
  };
}

export function setPageSize(store, pageSize) {
  const tableState = {
    ...getTableState(store),
    page: 1,
    pageSize
  };
  const remoteProvider = getRemoteProvider(store);

  return makeRequest(remoteProvider, tableState, (response) => {
    return setPageSizeRemoteHandler(response, pageSize);
  });
}

export function setPageSizeRemoteHandler(response, pageSize) {
  return dispatch => {
    // Append the data.
    dispatch(remoteAction(types.GRIDDLE_REMOTE_REPLACE_DATA, response));

    // Set the page size.
    dispatch(GriddleActions.setPageSize(pageSize));

    // Indicate that we're done loading.
    dispatch({ type: types.GRIDDLE_STOP_LOADING });
  };
}

export function sort(store, column) {
  const tableState = {
    ...getTableState(store),
    page: 1, // Reset the page
    sortColumn: [column],
    sortDirection: getUpdatedSortDirection(store, column)
  };
  const remoteProvider = getRemoteProvider(store);

  return makeRequest(remoteProvider, tableState, (response) => {
    return sortRemoteHandler(response, column);
  });
}

export function sortRemoteHandler(response, column) {
  return dispatch => {
    // Append the data.
    dispatch(remoteAction(types.GRIDDLE_REMOTE_REPLACE_DATA, response));

    // Finish the sort.
    dispatch(GriddleActions.sort(column));

    // Indicate that we're done loading.
    dispatch({ type: types.GRIDDLE_STOP_LOADING });
  };
}

export function addSortColumn(store, column) {
  let tableState = getTableState(store);
  tableState.column = tableState.column.concat(column);
  const remoteProvider = getRemoteProvider(store);

  return makeRequest(remoteProvider, tableState, (response) => {
    return addSortColumnRemoteHandler(response, column);
  });
}

export function addSortColumnRemoteHandler(response, column) {
  return dispatch => {
    // Append the data.
    dispatch(remoteAction(types.GRIDDLE_REMOTE_REPLACE_DATA, response));

    // Finish the sort.
    dispatch(GriddleActions.addSortColumn(column));

    // Indicate that we're done loading.
    dispatch({ type: types.GRIDDLE_STOP_LOADING });
  };
}

export function loadNext(store) {
  let tableState = getTableState(store);
  tableState.page++;
  const remoteProvider = getRemoteProvider(store);

  // If this is a page that has already been loaded, simply load the page.
  const loadedPages = getPagesLoaded(store);
  if (loadedPages.includes(tableState.page)) {
    return GriddleActions.loadNext();
  }

  return makeRequest(remoteProvider, tableState, (response) => {
    return loadNextRemoteHandler(response);
  });
}

export function loadNextRemoteHandler(response) {
  return dispatch => {
    // Append the data.
    dispatch(remoteAction(types.GRIDDLE_REMOTE_APPEND_DATA, response));

    // Load the next page, now that we have the data.
    dispatch(GriddleActions.loadNext());

    // Indicate that we're done loading.
    dispatch({ type: types.GRIDDLE_STOP_LOADING });
  }
}

export function loadPrevious(store) {
  let tableState = getTableState(store);
  tableState.page--;
  const remoteProvider = getRemoteProvider(store);

  // If this is a page that has already been loaded, simply load the page.
  const loadedPages = getPagesLoaded(store);
  if (loadedPages.includes(tableState.page)) {
    return GriddleActions.loadPrevious();
  }

  return makeRequest(remoteProvider, tableState, (response) => {
    return loadPreviousRemoteHandler(response);
  });
}

export function loadPreviousRemoteHandler(response) {
  return dispatch => {
    // Append the data.
    dispatch(remoteAction(types.GRIDDLE_REMOTE_PREPEND_DATA, response));

    // Load the previous page, now that we have the data.
    dispatch(GriddleActions.loadPrevious());

    // Indicate that we're done loading.
    dispatch({ type: types.GRIDDLE_STOP_LOADING });
  };
}

export function loadPage(store, number) {
  const tableState = {
    ...getTableState(store),
    page: number
  };
  const remoteProvider = getRemoteProvider(store);

  // If this is a page that has already been loaded, simply load the page.
  const loadedPages = getPagesLoaded(store);
  if (loadedPages.includes(tableState.page)) {
    return GriddleActions.loadPage(number);
  }

  // Make a remote request.
  return makeRequest(remoteProvider, tableState, (response) => {
    return loadPageRemoteHandler(response, number);
  });
}


export function loadPageRemoteHandler(response, number) {
  return dispatch => {
    // Replace the data.
    dispatch(remoteAction(types.GRIDDLE_REMOTE_REPLACE_DATA, response));

    // Load the specified page, now that we have the data.
    dispatch(GriddleActions.loadPage(number));

    // Indicate that we're done loading.
    dispatch({ type: types.GRIDDLE_STOP_LOADING });
  };
}

