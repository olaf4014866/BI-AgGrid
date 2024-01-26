let columnDefs = [];
let tableCode = null;
let popover = null;
let cell;
let importantDateForSQL = "";
let g_params;

let gridOptions = {
    defaultColDef: {
        width: 120,
        allowedAggFuncs: ['SUM', 'AVG', 'MAX', 'MIN'],
        sortable: true,
        filter: true,
        resizable: true,
        editable: false
    },
    autoGroupColumnDef: {
        width: 180,
        pinned: 'left',
        editable: false
    },
    enableCharts: true,
    rowBuffer: 0,
    columnDefs: columnDefs,
    rowModelType: 'serverSide',
    rowGroupPanelShow: 'always',
    animateRows: true,
    debug: false,
    suppressAggFuncInHeader: true,
    sideBar: {
        toolPanels: [{
            id: 'columns',
            labelDefault: 'Columns',
            labelKey: 'columns',
            iconKey: 'columns',
            toolPanel: 'agColumnsToolPanel',
            toolPanelParams: {
                suppressPivots: true,
                suppressPivotMode: true,
            }
        }],
        defaultToolPanel: 'columns'
    },
    enableRangeSelection: true,
    components: {
        customStatusBarComponent: CustomStatusBarComponent
    },
    statusBar: {
        statusPanels: [{
                statusPanel: 'customStatusBarComponent',
                align: 'left'
            },
            {
                statusPanel: 'agAggregationComponent'
            }
        ]
    },
    maxConcurrentDatasourceRequests: 1,
    cacheBlockSize: 40,
    maxBlocksInCache: 2,
    purgeClosedRowNodes: true,
    undoRedoCellEditing: true,
    undoRedoCellEditingLimit: 5,
    enableGroupEdit: true,
    onVirtualColumnsChanged: _.debounce(function() {
        if (extraDatas.dateRangeCount >= 10) {
            let visible = gridOptions.columnApi.getAllDisplayedVirtualColumns();
            let visibleDateTemp = [];
            let check = /^value\d*$/i;
            visible.map(row => {
                if (check.test(row.colDef.field)) {
                    visibleDateTemp.push(row.colDef.field);
                }
            });

            if (visibleDateTemp.length != 0) {
                let viewStart = visibleDateTemp[0].slice(5, visibleDateTemp[0].length) * 1;
                let viewEnd = visibleDateTemp[visibleDateTemp.length - 1].slice(5, visibleDateTemp[visibleDateTemp.length - 1].length) * 1;
                let calStart = extraDatas.visibleDate[0].slice(5, extraDatas.visibleDate[0].length) * 1;
                let calEnd = extraDatas.visibleDate[extraDatas.visibleDate.length - 1].slice(5, extraDatas.visibleDate[extraDatas.visibleDate.length - 1].length) * 1;

                if (viewEnd > calEnd || viewStart < calStart) {
                    extraDatas.visibleDate = visibleDateTemp;
                    gridOptions.api.onFilterChanged();
                }
            }
        }
    }, 500),
    getRowNodeId: function(row) {
        return row.rowId;
    },
    onRowGroupOpened: function(params) {
        var rowId = params.node.id;
        if (params.node.expanded) {
            if (extraDatas.expandedGroupIds.indexOf(rowId) < 0) {
                extraDatas.expandedGroupIds.push(rowId);
            }
        } else {
            extraDatas.expandedGroupIds = extraDatas.expandedGroupIds.filter(function(grpId) {
                return grpId != rowId;
            });
        }
    },
    onCellEditingStarted: async function(event) {
        if (document.getElementById("split").value === "READ-ONLY") {
            gridOptions.api.stopEditing();
        } else {
            cell = document.getElementsByClassName("ag-cell-edit-input")[0];
            console.log(event);
            let data = event.data.rowId.split(',');
            let groupByValue = "";

            if ((data[0].indexOf("attribute") != -1) || (data[0].indexOf("channel") != -1)) {
                groupByValue = data.splice(0, 1);
            }

            let payload = {
                startDate: extraDatas.dateRangeArray[parseInt(event.column.colDef.field.slice(5)) - 1][0],
                endDate: extraDatas.dateRangeArray[parseInt(event.column.colDef.field.slice(5)) - 1][1]
            };
            data.map((el, id) => {
                if (id < 10) {
                    payload['attribute' + (id + 1)] = parseInt(el);
                } else if (id < 13) {
                    payload['channel' + (id - 9)] = parseInt(el);
                } else {
                    payload['property'] = parseInt(el);
                }
            });
            payload['account'] = event.data.account;
            payload['model'] = event.data.model;
            payload['hierarchy'] = event.data.hierarchy;

            let tempPayloadGroupBy = [];
            tempPayloadGroupBy.push(...groupByValue);
            if (groupByValue.length > 0) {
                let pos = extraDatas.groupState.indexOf(...groupByValue);
                let tempArray = extraDatas.groupState.slice(0, pos + 1);
                tempPayloadGroupBy.push(...tempArray);
            }

            payload['groupBy'] = tempPayloadGroupBy;

            let result = await fetch('../api/history', {
                method: 'post',
                body: JSON.stringify(payload),
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": "Bearer " + token
                }
            }).then(res => res.json());
            console.log('history', result);
            let subtd = "";
            result.map(data => {
                subtd += "<tr><td>" + data.start_date + "</td>";
                subtd += "<td>" + data.end_date + "</td>";
                subtd += "<td>" + data.old_value + "->" + data.new_value + "</td>";
                subtd += "<td>" + data.count_agg + "</td>";
                subtd += "<td>" + data.change_hierarchy + "</td>";
                subtd += "<td>" + data.comment + "</td>";
                subtd += "<td>" + data.username + "</td></tr>"
            });
            let tmp = `<div class="history"><table><tr><th>Start Date</th><th>End Date</th><th>Total Value Change</th><th>Number of Cell Changed</th><th>Hierarchy</th><th>Comment</th><th>User</th>${subtd}</table></div>`;
            popover = new tippy(cell, {
                content: '<textarea id="commentarea" style="width: 100%" onchange="addComment()" onkeypress="enterPressOnComment(event)" placeholder="Comment:"></textarea><h4>History</h4>' + tmp,
                allowHTML: true,
                distance: 5,
                theme: 'light',
                trigger: 'click',
                // triggerTarget: cell,
                popperOptions: {
                    positionFixed: true,
                },
                interactive: true,
                appendTo: document.getElementById("myGrid"),
                placement: 'bottom',
                hideOnClick: true,
                maxWidth: 900,
                maxHeight: 200
            });
            cell.click();
            document.getElementById("commentarea").value = "";
        }
    },
    onCellValueChanged: async function(event) {
        // set comment when copy paste action
        if (event.source != "paste") {
            popover.hide();
        }

        if (event.source == "paste") {
            extraDatas.editComment = "Copy paste Action:" + event.oldValue + "->" + event.newValue;
        }

        let check = /[a-z,`~?!@#$'";:^&]/i;
        if (!check.test(event.newValue)) {
            if ((event.newValue * 1 != event.oldValue * 1)) {
                let result = await update_tree_value(event);
                if (extraDatas.groupState.length > 0) {
                    gridOptions.api.purgeServerSideCache();
                }
                // console.log(">>>>>>>>>>>>>>>>>>");
                // console.log(result);
                document.getElementById('o_n_values').innerHTML = 'Updated cell: ' + event.oldValue + '->' + event.newValue;
                document.getElementById('affectedCols').innerHTML = '. Affected ' + result.count_agg + 'cells below.';
            }
        } else {
            event.newValue = event.oldValue;
        }
    },
    onColumnRowGroupChanged: function(event) {
        extraDatas.groupState = [];
        event.columns.map(row => {
            extraDatas.groupState.push(row.colDef.field);
        });
    },
    onCellFocused: _.debounce(function(event) {
        let dateRangeArray = [];
        if (event.rowIndex) {
            console.log(extraDatas);
            if (typeof event.column.colDef.field !== "undefined") {
                dateRangeArray = extraDatas.dateRangeArray[parseInt(event.column.colDef.field.slice(5)) - 1];
            }
            createSTP(event.rowIndex, dateRangeArray);
            createBDP(event.rowIndex, dateRangeArray);
        }
    }, 500)
};

// my define variables
let extraDatas = {
    showType: "Daily",
    property: 1,
    visibleDate: [],
    dateRangeCount: 1,
    dateRangeArray: [],
    expandedGroupIds: [],
    aggfunction: "",
    groupState: ["attribute1"],
    editComment: "",
    valueColumn: [],
    valueCols: [],
}

// function processCellForClipboard(params) {
//     console.log(params);
//     console.log(params.column.colDef.field);
//     console.log(params.column.colDef.headerName);
//     let tempField = params.column.colDef.field;
//     if ( tempField.indexOf("attribute") ) {
//         console.log("dsdssdsf")
//         gridOptions.enableCellTextSelection=false;
//     }
// }

function enterPressOnComment(e) {
    if (e.which == 13) { //Enter keycode
        extraDatas.editComment = document.getElementById("commentarea").value;
        document.getElementById("commentarea").value = "";
        gridOptions.api.stopEditing();
    }
}

let property = document.getElementById("property");
let left1 = document.getElementById("left1");
let left2 = document.getElementById("left2");
let right1 = document.getElementById("right1");
let right2 = document.getElementById("right2");
let split = document.getElementById("split");
let dateStart = document.getElementById("startDate");
let dateEnd = document.getElementById("endDate");
let dailyType = document.getElementById("dailyType");
let btnGenerate = document.getElementById("btn-gen");
let btnCreateSTP = document.getElementById("btn-create-stp");
let btnCreateBDP = document.getElementById("btn-create-bdp");
let btnRefresh = document.getElementById("btn-refresh");
let btnImport = document.getElementById("btn-import");

let chart_stp = null,
    chart_bdp = null;
let typeChangeFlag = false;

btnGenerate.addEventListener("click", changeDateRangeAndType);
btnCreateSTP.addEventListener("click", onCreateSTP);
btnCreateBDP.addEventListener("click", onCreateBDP);

function onCreateSTP() {
    let dateRangeArray = [];
    let event = gridOptions.api.getFocusedCell();
    if (event != null && event.rowIndex) {
        console.log(extraDatas);
        if (typeof event.column.colDef.field !== "undefined") {
            dateRangeArray = extraDatas.dateRangeArray[parseInt(event.column.colDef.field.slice(5)) - 1];
        }
        createSTP(event.rowIndex, dateRangeArray);
    }
}

function onCreateBDP() {
    let dateRangeArray = [];
    let event = gridOptions.api.getFocusedCell();
    if (event != null && event.rowIndex) {
        console.log(extraDatas);
        if (typeof event.column.colDef.field !== "undefined") {
            dateRangeArray = extraDatas.dateRangeArray[parseInt(event.column.colDef.field.slice(5)) - 1];
        }
        createBDP(event.rowIndex, dateRangeArray);
    }
}

function createSTP(ids = -1, dateRangeArray = []) {
    console.log(dateRangeArray);
    let p1 = left1.options[left1.options.selectedIndex];
    let p2 = right1.options[right1.options.selectedIndex];
    let s1;
    if (ids < 0 || typeof(ids) != "number") {
        s1 = gridOptions.api.getDisplayedRowAtIndex(0).id;
    } else {
        s1 = gridOptions.api.getDisplayedRowAtIndex(ids).id;
    }
    let payload1 = {
        selected: s1,
        startDate: dateStart.value,
        endDate: dateEnd.value,
        time_segment: dailyType.value,
        v1: p1.getAttribute('idx'),
        v2: p2.getAttribute('idx'),
        aggFunc: property.options[property.options.selectedIndex].getAttribute('aggFunc'),
    };
    fetch('../../api/stp', {
            method: 'post',
            body: JSON.stringify(payload1),
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + token
            }
        })
        .then(httpResponse => httpResponse.json())
        .then(response => {
            console.log(response.result);
            if (response.result === "error") {
                return;
            }

            let year = response.result1.map(data => {
                return data.x;
            });
            let pp1 = response.result1.map(data => {
                return data.value;
            });
            let pp2 = response.result2 ? response.result2.map(data => data.value) : [];

            let data4plot = year.map((data, id) => {
                return {
                    year: data,
                    pp1: pp1[id],
                    pp2: pp2[id]
                }
            });
            console.log(data4plot);

            var grid = GridStack.init();
            var elString = "<div class='grid-stack-item' data-gs-noMove=true><div class='grid-stack-item-content'><div style='float: right;'><button class='close-window-btn' onClick='closeGridStack(this)'>X</button></div></div></div>"
            var newGridEl = grid.addWidget(elString, 0, 0, 12, 4, true);

            var options = {
                container: newGridEl,
                legend: {
                    enabled: true,
                    position: 'bottom',
                    markerSize: 10
                },
                title: {
                    text: 'Time-Series Plot',
                },
                subtitle: {
                    text: p1.value + ":" + p2.value
                },
                data: data4plot,
                series: [{
                        xKey: 'year',
                        yKey: 'pp1',
                        yName: p1.value,
                        tooltipEnabled: true,
                    },
                    {
                        xKey: 'year',
                        yKey: 'pp2',
                        yName: p2.value,
                        stroke: 'black',
                        marker: {
                            fill: 'gray',
                            stroke: 'black',
                        },
                        tooltipEnabled: true,
                    },
                ],
                axes: [{
                        type: 'category',
                        position: 'bottom',
                        label: {
                            rotation: -60
                        }
                    },
                    {
                        type: 'number',
                        position: 'left'
                    }
                ],
            };
            chart_stp = agCharts.AgChart.create(options);
        })
        .catch(error => {
            console.error(error);
        });
}

function createBDP(ids = -1, dateRangeArray = []) {
    let s1;
    if (ids < 0 || typeof(ids) != "number") {
        s1 = gridOptions.api.getDisplayedRowAtIndex(0).id;
    } else {
        s1 = gridOptions.api.getDisplayedRowAtIndex(ids).id;
    }
    if (dateRangeArray.length && extraDatas.groupState.length) {
        let pr1 = left2.options[left2.options.selectedIndex];
        let pr2 = right2.options[right2.options.selectedIndex];
        let payload2 = {
            selected: s1,
            v1: pr1.getAttribute('idx'),
            v2: pr2.getAttribute('idx'),
            time_segment: dailyType.value,
            aggFunc: property.options[property.options.selectedIndex].getAttribute('aggFunc'),
            startDate: dateRangeArray[0],
            endDate: dateRangeArray[1],
            lastGrouped: extraDatas.groupState[extraDatas.groupState.length - 1]
        }
        fetch('../../api/bdp', {
                method: 'post',
                body: JSON.stringify(payload2),
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": "Bearer " + token
                }
            })
            .then(httpResponse => httpResponse.json())
            .then(response => {
                console.log(response);
                if (response.result === "error") {
                    return;
                }

                let grouped = response.result1.map(data => {
                    return getStringVal(extraDatas.groupState[0], data[extraDatas.groupState[0]]);
                });
                let pp1 = response.result1.map(data => {
                    return data.y;
                });
                let pp2 = response.result2 ? response.result2.map(data => data.y) : [];

                let data4plot = grouped.map((data, id) => {
                    return {
                        grouped: data,
                        pp1: pp1[id],
                        pp2: pp2[id] ? pp2[id] : 0
                    }
                });
                console.log(data4plot);
                var grid = GridStack.init();
                var elString = "<div class='grid-stack-item' data-gs-noMove=true><div class='grid-stack-item-content'><div style='float: right;'><button class='close-window-btn' onClick='closeGridStack(this)'>X</button></div></div></div>"
                var newGridEl = grid.addWidget(elString, 0, 0, 12, 4, true);

                var options = {
                    container: newGridEl,
                    legend: {
                        enabled: true,
                        position: 'bottom',
                        color: '#000000',
                        markerSize: 10
                    },
                    title: {
                        text: 'Breakdown Plot',
                    },
                    subtitle: {
                        text: pr1.value + ":" + pr2.value
                    },
                    data: data4plot,
                    series: [{
                        type: 'column',
                        xKey: 'grouped',
                        yKeys: ['pp1', 'pp2'],
                        yNames: [pr1.value, pr2.value],
                        tooltipEnabled: true,
                        // grouped: true
                    }],
                    axes: [{
                            type: 'category',
                            position: 'bottom',
                            label: {
                                rotation: -60
                            }
                        },
                        {
                            type: 'number',
                            position: 'left'
                        }
                    ],
                };
                chart_bdp = agCharts.AgChart.create(options);
            })
            .catch(error => {
                console.error(error);
            });
    }
}

property.addEventListener("change", (e) => {
    for (let i = split.options.length - 1; i > -1; i--) {
        split.remove(i);
    }
    // console.log(e.target)
    e.target.options[e.target.options.selectedIndex].getAttribute('splitFunc').split(",").map(func => {
        addOptions(split, func);
    });
    changeDateRangeAndType();
});

dailyType.addEventListener("change", () => {
    typeChangeFlag = true;
    changeDateRangeAndType();
})

const datasource = {
    getRows(params) {
        g_params = params;
        fetch('../../api/', {
                method: 'post',
                body: JSON.stringify({
                    request: params.request,
                    extraDatas: extraDatas,
                    dateForSelect: dateEnd.value
                }),
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": "Bearer " + token
                }
            })
            .then(httpResponse => httpResponse.json())
            .then(response => {
                // console.log(response);
                params.successCallback(response.rows, response.lastRow);
                extraDatas.expandedGroupIds.map(row => {
                    if (gridOptions.api.getRowNode(row) != null) {
                        gridOptions.api.getRowNode(row).setExpanded(true);
                    }
                });
            })
            .catch(error => {
                console.error(error);
                params.failCallback();
            });
    }
};

const gridDiv = document.querySelector('#myGrid');

document.addEventListener('DOMContentLoaded', async function() {
    var grid = GridStack.init();
    var getUrl = window.location;
    var baseUrl = getUrl.protocol + "//" + getUrl.host + "/api/init";
    // console.log(baseUrl);
    await fetch(baseUrl, {
            method: 'get',
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + token
            }
        })
        .then(response => response.json())
        .then(res => {
            // console.log("SEND");
            // console.log(res);
            gridOptions.columnDefs = res.colDefs;
            extraDatas.valueColumn = res.colDefs;
            tableCode = res.codes;
            columnDefs = res.colDefs;

            // set startdate and enddate to first date of tree table
            dateStart.value = res.startDate;
            dateEnd.value = res.endDate;
            importantDateForSQL = res.startDate;

            res.property.map((data, id) => {
                property.appendChild(addProperty(data, id + 1));

                left1.appendChild(addProperty(data, id + 1, id === 0));

                left2.appendChild(addProperty(data, id + 1, id === 0));

                right1.appendChild(addProperty(data, id + 1));

                right2.appendChild(addProperty(data, id + 1));
            });
            property.options[property.options.selectedIndex].getAttribute('splitfunc').split(",").map(func => {
                addOptions(split, func);
            });
        })
        .catch(error => {
            console.error(error);
            params.failCallback();
        });

    new agGrid.Grid(gridDiv, gridOptions);
    gridOptions.api.setServerSideDatasource(datasource);

    // if there is localstorage data set options with that and load ag grid
    if (localStorage.getItem("selections_layout")) {
        let localStorageTemp = JSON.parse(localStorage.getItem("selections_layout"));
        dateStart.value = localStorageTemp.start_date;
        dateEnd.value = localStorageTemp.end_date;
        property.value = localStorageTemp.property;

        // delete split select box options
        let i, L = split.options.length - 1;
        for (i = L; i >= 0; i--) {
            split.remove(i);
        }

        property.options[property.options.selectedIndex].getAttribute('splitfunc').split(",").map(func => {
            addOptions(split, func);
        });
        split.value = localStorageTemp.split_function;
    }
    changeDateRangeAndType();
});

function changeDateRangeAndType() {
    extraDatas.showType = dailyType.value;
    let showType = extraDatas.showType;
    let start = dateStart.value;
    let end = dateEnd.value;
    let tempColDef = [];
    let dateRangeArrayTemp = [];

    let valEditable = true;
    if (split.value == "READ-ONLY") {
        valEditable = false;
    }

    let dStart = new Date(...prepareDate(start));
    let dEnd = new Date(...prepareDate(end));
    let milsStart = dStart.getTime();
    let milsEnd = dEnd.getTime();
    let aggfuc = property.options[property.options.selectedIndex].getAttribute('aggfunc');

    // to set columndef according to show type, here get tempcoldef
    // also get dateRangeArrayTemp array [startdate, enddate]
    switch (showType) {
        case "Daily":
            if (milsEnd === milsStart) {
                let tmp = new Date(milsEnd);
                dateRangeArrayTemp.push([convertToDate(tmp), convertToDate(tmp)]);
                tempColDef.push({
                    headerName: convertToDate(tmp),
                    field: "value1",
                    aggFunc: aggfuc,
                    editable: valEditable,
                    valueParser: function(params) {
                        return calculateString(params);
                    },
                    cellStyle: function(params) {
                        return {
                            'background-color': getBackColor(params)
                        }
                    }
                });
            } else {
                let dif = Math.abs(milsEnd - milsStart);
                let tempDay = milsEnd > milsStart ? milsStart : milsEnd;
                let num = 1;
                while (dif >= 0) {
                    let d = new Date(tempDay);
                    dateRangeArrayTemp.push([convertToDate(d), convertToDate(d)]);
                    tempColDef.push({
                        headerName: convertToDate(d),
                        field: "value" + num,
                        aggFunc: aggfuc,
                        editable: valEditable,
                        valueParser: function(params) {
                            return calculateString(params);
                        },
                        cellStyle: function(params) {
                            return {
                                'background-color': getBackColor(params)
                            }
                        }
                    });
                    num++;
                    dif -= ONE_DAY;
                    tempDay += ONE_DAY;
                }
                // insert last date if there is't
                let lastDate = milsEnd < milsStart ? milsStart : milsEnd;
                lastDate = convertToDate(new Date(lastDate));
                if (lastDate != dateRangeArrayTemp[dateRangeArrayTemp.length - 1][0]) {
                    dateRangeArrayTemp.push([lastDate, lastDate]);
                    tempColDef.push({
                        headerName: lastDate,
                        field: "value" + num,
                        aggFunc: aggfuc,
                        editable: valEditable,
                        valueParser: function(params) {
                            return calculateString(params);
                        },
                        cellStyle: function(params) {
                            return {
                                'background-color': getBackColor(params)
                            }
                        }
                    });
                }
            }
            break;
        case "Weekly":
            {
                if (milsEnd === milsStart) {
                    let tmp = new Date(milsEnd);
                    let num = 1;
                    dateRangeArrayTemp.push([convertToDate(tmp), convertToDate(tmp)]);
                    tempColDef.push({
                        headerName: getWeekYear(tmp) + "-W" + getWeek(tmp),
                        field: "value1",
                        aggFunc: aggfuc,
                        editable: valEditable,
                        valueParser: function(params) {
                            return calculateString(params);
                        },
                        cellStyle: function(params) {
                            return {
                                'background-color': getBackColor(params)
                            }
                        }
                    });
                } else {
                    let dif = Math.abs(milsEnd - milsStart);
                    let tempDay = milsEnd > milsStart ? milsStart : milsEnd;
                    let weekstart = new Date(tempDay);
                    let num = 1;
                    while (dif >= 0) {
                        let d = new Date(tempDay);
                        let nextday = new Date(tempDay + ONE_DAY);
                        if (getWeek(d) != getWeek(nextday)) {
                            dateRangeArrayTemp.push([convertToDate(weekstart), convertToDate(d)]);
                            tempColDef.push({
                                headerName: getWeekYear(d) + "-W" + getWeek(d),
                                field: "value" + num,
                                aggFunc: aggfuc,
                                editable: valEditable,
                                valueParser: function(params) {
                                    return calculateString(params);
                                },
                                cellStyle: function(params) {
                                    return {
                                        'background-color': getBackColor(params)
                                    }
                                }
                            });
                            weekstart = new Date(tempDay + ONE_DAY);
                            num++;
                        } else if (dif == 0) {
                            dateRangeArrayTemp.push([convertToDate(weekstart), convertToDate(d)]);
                            tempColDef.push({
                                headerName: getWeekYear(d) + "-W" + getWeek(d),
                                field: "value" + num,
                                aggFunc: aggfuc,
                                editable: valEditable,
                                valueParser: function(params) {
                                    return calculateString(params);
                                },
                                cellStyle: function(params) {
                                    return {
                                        'background-color': getBackColor(params)
                                    }
                                }
                            });
                            weekstart = new Date(tempDay + ONE_DAY);
                            num++;
                        }

                        dif -= ONE_DAY;
                        tempDay += ONE_DAY;
                    }
                    if (dateRangeArrayTemp[dateRangeArrayTemp.length - 1][1] != end) {
                        let tempstart = dateRangeArrayTemp[dateRangeArrayTemp.length - 1][1];
                        tempstart = new Date(...prepareDate(tempstart));
                        tempstart = tempstart.getTime() + ONE_DAY;
                        tempstart = new Date(tempstart)
                        dateRangeArrayTemp.push([convertToDate(tempstart), end]);
                        tempColDef.push({
                            headerName: getWeekYear(tempstart) + "-W" + getWeek(tempstart),
                            field: "value" + num,
                            aggFunc: aggfuc,
                            editable: valEditable,
                            valueParser: function(params) {
                                return calculateString(params);
                            },
                            cellStyle: function(params) {
                                return {
                                    'background-color': getBackColor(params)
                                }
                            }
                        });
                    }
                }
            }
            break;
        case "Monthly":
            {
                if (milsEnd === milsStart) {
                    let tmp = new Date(milsEnd);
                    let num = 1;
                    dateRangeArrayTemp.push([convertToDate(tmp), convertToDate(tmp)]);
                    tempColDef.push({
                        headerName: convertToDate(tmp).slice(0, 7),
                        field: "value1",
                        aggFunc: aggfuc,
                        editable: valEditable,
                        valueParser: function(params) {
                            return calculateString(params);
                        },
                        cellStyle: function(params) {
                            return {
                                'background-color': getBackColor(params)
                            }
                        }
                    });
                } else {
                    let dif = Math.abs(milsEnd - milsStart);
                    let tempDay = milsEnd > milsStart ? milsStart : milsEnd;
                    let monthstart = new Date(tempDay);
                    let num = 1;
                    while (dif >= 0) {
                        let d = new Date(tempDay);
                        let nextday = new Date(tempDay + ONE_DAY);
                        if (convertToDate(d).slice(0, 7) != convertToDate(nextday).slice(0, 7)) {
                            dateRangeArrayTemp.push([convertToDate(monthstart), convertToDate(d)]);
                            tempColDef.push({
                                headerName: convertToDate(d).slice(0, 7),
                                field: "value" + num,
                                aggFunc: aggfuc,
                                editable: valEditable,
                                valueParser: function(params) {
                                    return calculateString(params);
                                },
                                cellStyle: function(params) {
                                    return {
                                        'background-color': getBackColor(params)
                                    }
                                }
                            });
                            monthstart = new Date(tempDay + ONE_DAY);
                            num++;
                        } else if (dif == 0) {
                            dateRangeArrayTemp.push([convertToDate(monthstart), convertToDate(d)]);
                            tempColDef.push({
                                headerName: convertToDate(d).slice(0, 7),
                                field: "value" + num,
                                aggFunc: aggfuc,
                                editable: valEditable,
                                valueParser: function(params) {
                                    return calculateString(params);
                                },
                                cellStyle: function(params) {
                                    return {
                                        'background-color': getBackColor(params)
                                    }
                                }
                            });
                            monthstart = new Date(tempDay + ONE_DAY);
                            num++;
                        }

                        dif -= ONE_DAY;
                        tempDay += ONE_DAY;
                    }
                    if (dateRangeArrayTemp[dateRangeArrayTemp.length - 1][1] != end) {
                        let tempstart = dateRangeArrayTemp[dateRangeArrayTemp.length - 1][1];
                        tempstart = new Date(...prepareDate(tempstart));
                        tempstart = tempstart.getTime() + ONE_DAY;
                        tempstart = new Date(tempstart)
                        dateRangeArrayTemp.push([convertToDate(tempstart), end]);
                        tempColDef.push({
                            headerName: convertToDate(tempstart).slice(0, 7),
                            field: "value" + num,
                            aggFunc: aggfuc,
                            editable: valEditable,
                            valueParser: function(params) {
                                return calculateString(params);
                            },
                            cellStyle: function(params) {
                                return {
                                    'background-color': getBackColor(params)
                                }
                            }
                        });
                    }
                }
            }
            break;
        case "Yearly":
            {
                if (milsEnd === milsStart) {
                    let tmp = new Date(milsEnd);
                    let num = 1;
                    dateRangeArrayTemp.push([convertToDate(tmp), convertToDate(tmp)]);
                    tempColDef.push({
                        headerName: convertToDate(tmp).slice(0, 4),
                        field: "value1",
                        aggFunc: aggfuc,
                        editable: valEditable,
                        valueParser: function(params) {
                            return calculateString(params);
                        },
                        cellStyle: function(params) {
                            return {
                                'background-color': getBackColor(params)
                            }
                        }
                    });
                } else {
                    let dif = Math.abs(milsEnd - milsStart);
                    let tempDay = milsEnd > milsStart ? milsStart : milsEnd;
                    let yearstart = new Date(tempDay);
                    let num = 1;
                    while (dif >= 0) {
                        let d = new Date(tempDay);
                        let nextday = new Date(tempDay + ONE_DAY);
                        if (convertToDate(d).slice(0, 4) != convertToDate(nextday).slice(0, 4)) {
                            dateRangeArrayTemp.push([convertToDate(yearstart), convertToDate(d)]);
                            tempColDef.push({
                                headerName: convertToDate(d).slice(0, 4),
                                field: "value" + num,
                                aggFunc: aggfuc,
                                editable: valEditable,
                                valueParser: function(params) {
                                    return calculateString(params);
                                },
                                cellStyle: function(params) {
                                    return {
                                        'background-color': getBackColor(params)
                                    }
                                }
                            });
                            yearstart = new Date(tempDay + ONE_DAY);
                            num++;
                        } else if (dif == 0) {
                            dateRangeArrayTemp.push([convertToDate(yearstart), convertToDate(d)]);
                            tempColDef.push({
                                headerName: convertToDate(d).slice(0, 4),
                                field: "value" + num,
                                aggFunc: aggfuc,
                                editable: valEditable,
                                valueParser: function(params) {
                                    return calculateString(params);
                                },
                                cellStyle: function(params) {
                                    return {
                                        'background-color': getBackColor(params)
                                    }
                                }
                            });
                            yearstart = new Date(tempDay + ONE_DAY);
                            num++;
                        }

                        dif -= ONE_DAY;
                        tempDay += ONE_DAY;
                    }
                    if (dateRangeArrayTemp[dateRangeArrayTemp.length - 1][1] != end) {
                        let tempstart = dateRangeArrayTemp[dateRangeArrayTemp.length - 1][1];
                        tempstart = new Date(...prepareDate(tempstart));
                        tempstart = tempstart.getTime() + ONE_DAY;
                        tempstart = new Date(tempstart)
                        dateRangeArrayTemp.push([convertToDate(tempstart), end]);
                        tempColDef.push({
                            headerName: convertToDate(tempstart).slice(0, 4),
                            field: "value" + num,
                            aggFunc: aggfuc,
                            editable: valEditable,
                            valueParser: function(params) {
                                return calculateString(params);
                            },
                            cellStyle: function(params) {
                                return {
                                    'background-color': getBackColor(params)
                                }
                            }
                        });
                    }
                }
            }
            break;
        case "Quarterly":
            {
                if (milsEnd === milsStart) {
                    let tmp = new Date(milsEnd);
                    let num = 1;
                    dateRangeArrayTemp.push([convertToDate(tmp), convertToDate(tmp)]);
                    tempColDef.push({
                        headerName: getQuarter(tmp),
                        field: "value1",
                        aggFunc: aggfuc,
                        editable: valEditable,
                        valueParser: function(params) {
                            return calculateString(params);
                        },
                        cellStyle: function(params) {
                            return {
                                'background-color': getBackColor(params)
                            }
                        }
                    });
                } else {
                    let dif = Math.abs(milsEnd - milsStart);
                    let tempDay = milsEnd > milsStart ? milsStart : milsEnd;
                    let quarterstart = new Date(tempDay);
                    let num = 1;
                    while (dif >= 0) {
                        let d = new Date(tempDay);
                        let nextday = new Date(tempDay + ONE_DAY);
                        if (getQuarter(d) != getQuarter(nextday)) {
                            dateRangeArrayTemp.push([convertToDate(quarterstart), convertToDate(d)]);
                            tempColDef.push({
                                headerName: getQuarter(d),
                                field: "value" + num,
                                aggFunc: aggfuc,
                                editable: valEditable,
                                valueParser: function(params) {
                                    return calculateString(params);
                                },
                                cellStyle: function(params) {
                                    return {
                                        'background-color': getBackColor(params)
                                    }
                                }
                            });
                            quarterstart = new Date(tempDay + ONE_DAY);
                            num++;
                        } else if (dif == 0) {
                            dateRangeArrayTemp.push([convertToDate(quarterstart), convertToDate(d)]);
                            tempColDef.push({
                                headerName: getQuarter(d),
                                field: "value" + num,
                                aggFunc: aggfuc,
                                editable: valEditable,
                                valueParser: function(params) {
                                    return calculateString(params);
                                },
                                cellStyle: function(params) {
                                    return {
                                        'background-color': getBackColor(params)
                                    }
                                }
                            });
                            quarterstart = new Date(tempDay + ONE_DAY);
                            num++;
                        }

                        dif -= ONE_DAY;
                        tempDay += ONE_DAY;
                    }
                    if (dateRangeArrayTemp[dateRangeArrayTemp.length - 1][1] != end) {
                        let tempstart = dateRangeArrayTemp[dateRangeArrayTemp.length - 1][1];
                        tempstart = new Date(...prepareDate(tempstart));
                        tempstart = tempstart.getTime() + ONE_DAY;
                        tempstart = new Date(tempstart)
                        dateRangeArrayTemp.push([convertToDate(tempstart), end]);
                        tempColDef.push({
                            headerName: getQuarter(tempstart),
                            field: "value" + num,
                            aggFunc: aggfuc,
                            editable: valEditable,
                            valueParser: function(params) {
                                return calculateString(params);
                            },
                            cellStyle: function(params) {
                                return {
                                    'background-color': getBackColor(params)
                                }
                            }
                        });
                    }
                }
            }
            break;
    }

    // push date count to dateRangeArrayTemp so result => [startdate,enddate,datecount]
    dateRangeArrayTemp.map(row => {
        row.push(getDateCount(row[0], row[1]));
    });

    // delete not full columns from tempColDef
    switch (showType) {
        case "Weekly":
            {
                if (dateRangeArrayTemp[0][2] < 7) {
                    tempColDef.splice(0, 1);
                }
                if (dateRangeArrayTemp[dateRangeArrayTemp.length - 1][2] < 7) {
                    tempColDef.splice(tempColDef.length - 1, 1);
                }
            }
            break;
        case "Monthly":
            {
                if (dateRangeArrayTemp[0][2] < 27) {
                    tempColDef.splice(0, 1);
                }
                if (dateRangeArrayTemp[dateRangeArrayTemp.length - 1][2] < 27) {
                    tempColDef.splice(tempColDef.length - 1, 1);
                }
            }
            break;
        case "Yearly":
            {
                if (dateRangeArrayTemp[0][2] < 360) {
                    tempColDef.splice(0, 1);
                }
                if (dateRangeArrayTemp[dateRangeArrayTemp.length - 1][2] < 360) {
                    tempColDef.splice(tempColDef.length - 1, 1);
                }
            }
            break;
        case "Quarterly":
            {
                if (dateRangeArrayTemp[0][2] < 85) {
                    tempColDef.splice(0, 1);
                }
                if (dateRangeArrayTemp[dateRangeArrayTemp.length - 1][2] < 85) {
                    tempColDef.splice(tempColDef.length - 1, 1);
                }
            }
            break;
    }

    extraDatas.aggfunction = aggfuc;
    extraDatas.dateRangeCount = tempColDef.length;

    // dateRangeArray type: [startdate,enddate,counts]
    extraDatas.dateRangeArray = dateRangeArrayTemp;

    // set gridoptions.visibleDate dates
    if (tempColDef.length <= 10) {
        // if date range is less than 10 get all date values
        // so that set visibleDate to date range
        extraDatas.visibleDate = [];
        tempColDef.map(row => {
            extraDatas.visibleDate.push(row["field"]);
        })
    } else {
        // if date range is over than 10 get visible columns 
        let visible = gridOptions.columnApi.getAllDisplayedVirtualColumns();
        let visibleDateTemp = [];
        let check = /^value\d*$/i;
        visible.map(row => {
            if (check.test(row.colDef.field)) {
                visibleDateTemp.push(row.colDef.field);
            }
        });

        // console.log("visibleDateTemp");
        // console.log(visibleDateTemp);
        // if there is no visible date set visibledateTemp for 5days
        if (visibleDateTemp.length == 0) {
            for (var i = 1; i <= 5; i++) {
                // visibleDateTemp.push("value" + i);
                visibleDateTemp.push(tempColDef[i - 1]["field"]);
            }
        }
        // set visible dates
        extraDatas.visibleDate = visibleDateTemp;
    }

    gridOptions.columnDefs = [...columnDefs, ...tempColDef];

    extraDatas.valueColumn = tempColDef;
    extraDatas.property = property.options[property.options.selectedIndex].getAttribute('idx');

    // console.log(extraDatas);
    // console.log(tempColDef);

    gridOptions.api.setColumnDefs(gridOptions.columnDefs);
}

// update tree value
async function update_tree_value(event) {
    let temp = event.data;
    // result:  variable that will be send to server side
    let result = {
        account: -1,
        model: -1,
        hierarchy: -1,
        user: -1,
        active: -1,
        tag: -1,
        attribute1: -1,
        attribute2: -1,
        attribute3: -1,
        attribute4: -1,
        attribute5: -1,
        attribute6: -1,
        attribute7: -1,
        attribute8: -1,
        attribute9: -1,
        attribute10: -1,
        channel1: -1,
        channel2: -1,
        channel3: -1,
        property: -1,
        value_date_start: -1,
        value_date_end: -1,
        date_count: -1,
        new_value_agg: -1,
        old_value_agg: -1,
        aggregate_function_agg: -1,
        split_function_agg: -1,
        date_created: -1,
        comment: -1,
        rowId: "",
        propertyIntVal: -1
    };

    // insert int val to attr..., and channel...
    Object.keys(result).map((row, id) => {
        if (Object.keys(temp).indexOf(row) != -1) {
            result[row] = getIntVal(row, temp[row]);
        }
    });

    result.date_created = getNowDate();
    result.split_function_agg = document.getElementById("split").value;
    result.aggregate_function_agg = extraDatas.aggfunction;
    result.old_value_agg = event.oldValue;
    result.new_value_agg = eval(event.newValue);
    result.editedField = event.colDef.field;
    result.propertyIntVal = getIntVal("property", result.rowId.split(",")[result.rowId.split(",").length - 1] * 1);

    // if there is no comment insert formula that used for calculate cell
    if (extraDatas.editComment == "") {
        result.comment = "Fomula: " + formula;
    } else {
        result.comment = extraDatas.editComment;
    }

    // get changed column's start date and end date , date counts
    let editedValue = event.colDef.field;
    let editedValueIndex = editedValue.slice(5, editedValue.length) * 1 - 1;
    result.value_date_start = extraDatas.dateRangeArray[editedValueIndex][0];
    result.value_date_end = extraDatas.dateRangeArray[editedValueIndex][1];
    result.date_count = extraDatas.dateRangeArray[editedValueIndex][2];

    console.log("------------edited info-----------");
    console.log(result);

    // clean comment
    if (extraDatas.editComment.indexOf("Copy paste Action:") != -1) {
        extraDatas.editComment = "";
    }

    let grouping = [];
    if ((result.rowId.split(",")[0].indexOf("attribute") != -1) || (result.rowId.split(",")[0].indexOf("channel") != -1)) {
        // if aggregated row changed
        grouping = extraDatas.groupState.slice(0, extraDatas.groupState.indexOf(result.rowId.split(",")[0]) + 1);
        // console.log(grouping);
    }

    let resData = null;
    await fetch('../../api/update', {
            method: 'post',
            body: JSON.stringify({
                result: result,
                grouping: grouping
            }),
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + token
            }
        })
        .then(httpResponse => httpResponse.json())
        .then(response => {
            // console.log(response);
            resData = response.result;
        })
        .catch(error => {
            console.error(error);
        });

    return resData;
}