class DataService {
    constructor() {
        this.sqlite3 = require('sqlite3').verbose();
        this.db = new this.sqlite3.Database('./Datas/productions.db');
        this.papa = require('papaparse');
        this._ = require('lodash');
        this.fs = require('fs');
        this.bcrypt = require('bcrypt');

        this.fs.appendFile("./history/dbAccessHistory.log", "\n\n<<<<<<<<<<<<<<<<<<<<NEW USER>>>>>>>>>>>>>>>>>\n", (err) => {
            if (err) console.log(err);
            console.log("Successfully Written to dbAccessHistory.log.");
        });

        this.initDatas = {};
        this.codes = [];
        this.property = [];

        this.split_code = {
            COPY: 1,
            FACTOR: 2,
            DIVIDE: 3
        };
        this.agg_code = {
            SUM: 0,
            AVG: 1,
            MIN: 2,
            MAX: 3
        };
    }

    updateData(request, cb) {
        let result = request.result;
        let grouping = request.grouping;
        let count_agg;
        let sum_agg;
        let avg_agg;
        let max_change = 0;
        let newCellValue;
        let insertTreeSQL = "";
        let tempWhere = [];

        let selectCountSQL = "SELECT COUNT( value ) AS count_agg,  ROUND(SUM( value ),2) AS sum_agg, ROUND(AVG( value ),2) AS avg_agg FROM (SELECT   *,  ROW_NUMBER( ) OVER (PARTITION BY attribute1,attribute2, attribute3, attribute4, attribute5, attribute6, attribute7, attribute8, attribute9, attribute10,channel1,   channel2,channel3,value_date ORDER BY  change DESC ) AS row_num FROM tree WHERE ";
        if (isNaN(parseInt(result.rowId.split(",")[0]))) {
            grouping.map((row, id) => {
                if (row.indexOf("attribute") > -1) {
                    tempWhere.push(row + " = " + result.rowId.split(",")[parseInt(row.slice(-1))]);
                }
                if (row.indexOf("channel") > -1) {
                    tempWhere.push(row + " = " + result.rowId.split(",")[parseInt(row.slice(-1)) + 10]);
                }
            });
            selectCountSQL += tempWhere.join(" AND ");
        } else {
            selectCountSQL += result.rowId.split(",").map((data, id) => {
                if (id < 10) {
                    return "attribute" + (id + 1) + "=" + data;
                }
                if (id < 13) {
                    return "channel" + (id - 9) + "=" + data;
                }
                return "property=" + data;
            }).join(" AND ");
        }
        selectCountSQL += " AND value_date BETWEEN '" + result.value_date_start + "' AND '" + result.value_date_end + "') WHERE row_num = 1;";
        let selectMaxChange = 'SELECT max(change) as max_change FROM "changes"';

        console.log("------------------------selectCountSQL");
        console.log(selectCountSQL);
        this.db.all(selectCountSQL, (_err, results) => {
            count_agg = results[0]["count_agg"];
            sum_agg = results[0]["sum_agg"];
            avg_agg = results[0]["avg_agg"];
            this.db.all(selectMaxChange, (_err, results) => {
                if (results[0]["max_change"] == null) {
                    max_change = 0;
                } else {
                    max_change = results[0]["max_change"];
                }

                let caseStr = result.aggregate_function_agg.toUpperCase() + "+" + result.split_function_agg.toUpperCase();
                switch (caseStr) {
                    case "AVG+COPY":
                        {
                            newCellValue = result.new_value_agg;
                        }
                        break;
                    case "SUM+DIVIDE":
                        {
                            if (result.date_count == 0) {
                                newCellValue = result.new_value_agg / count_agg;
                            } else {
                                newCellValue = result.new_value_agg / count_agg;
                            }
                        }
                        break;
                    case "AVG+FACTOR":
                        {
                            newCellValue = " value *" + result.new_value_agg + "/" + result.old_value_agg + " ";
                        }
                        break;
                    case "SUM+FACTOR":
                        {
                            newCellValue = " value *" + result.new_value_agg + "/" + result.old_value_agg + " ";
                        }
                        break;
                }

                let groupBy = "";
                Object.keys(result).map((row, id) => {
                    if ((row.indexOf("attribute") != -1) || (row.indexOf("channel") != -1)) {
                        if (result[row] != -1) {
                            groupBy += " AND " + row + " = " + result[row];
                        }
                    }
                });

                let updateActiveZero = "update tree set active = 0 where ";
                if (tempWhere.length == 0) {
                    updateActiveZero += "value_date BETWEEN '" + result.value_date_start + "' AND '" + result.value_date_end + "' AND account = " + result.account + " AND model = " + result.model + " AND hierarchy = " + result.hierarchy + " AND user = " + result.user + " AND active = 1 AND tag = " + result.tag + groupBy + " AND property = " + result.propertyIntVal;

                    insertTreeSQL = "INSERT INTO tree SELECT account,model,hierarchy,attribute1,attribute2,attribute3,attribute4,attribute5,attribute6,attribute7,attribute8,attribute9,attribute10,channel1,channel2,channel3,property," + newCellValue + " AS value,value_date,strftime( '%Y-%m-%d', 'now' ) AS date_created,user,1 as active,tag," + (max_change + 1) + " AS change_agg FROM ( SELECT * ,row_number( ) over (partition BY attribute1,attribute2,attribute3,attribute4,attribute5,attribute6,attribute7,attribute8,attribute9,attribute10,channel1,channel2,channel3, value_date ORDER BY change DESC ) AS row_num FROM tree WHERE value_date BETWEEN '" + result.value_date_start + "' AND '" + result.value_date_end + "' AND account = " + result.account + " AND model = " + result.model + " AND hierarchy = " + result.hierarchy + " AND user = " + result.user + " AND active = 0 AND tag = " + result.tag + groupBy + " AND property = " + result.propertyIntVal + " ) rows WHERE  row_num = 1";
                } else {
                    updateActiveZero += " value_date BETWEEN '" + result.value_date_start + "' AND '" + result.value_date_end + "' AND account = " + result.account + " AND model = " + result.model + " AND hierarchy = " + result.hierarchy + " AND user = " + result.user + " AND active = 1 AND tag = " + result.tag + groupBy + " AND property = " + result.propertyIntVal + " AND " + tempWhere.join(" AND ");

                    insertTreeSQL = "INSERT INTO tree SELECT account,model,hierarchy,attribute1,attribute2,attribute3,attribute4,attribute5,attribute6,attribute7,attribute8,attribute9,attribute10,channel1,channel2,channel3,property," + newCellValue + " AS value,value_date,strftime( '%Y-%m-%d', 'now' ) AS date_created,user,1 as active,tag," + (max_change + 1) + " AS change_agg FROM ( SELECT * ,row_number( ) over (partition BY attribute1,attribute2,attribute3,attribute4,attribute5,attribute6,attribute7,attribute8,attribute9,attribute10,channel1,channel2,channel3, value_date ORDER BY change DESC ) AS row_num FROM tree WHERE value_date BETWEEN '" + result.value_date_start + "' AND '" + result.value_date_end + "' AND account = " + result.account + " AND model = " + result.model + " AND hierarchy = " + result.hierarchy + " AND user = " + result.user + " AND active = 0 AND tag = " + result.tag + groupBy + " AND property = " + result.propertyIntVal + " AND " + tempWhere.join(" AND ") + " ) rows WHERE  row_num = 1";
                }

                console.log("---------insert into tree--------");
                console.log(insertTreeSQL);
                this.db.all(updateActiveZero, (_err, results) => {
                    this.db.all(insertTreeSQL, (_err, results) => {

                        let logTempText = "========INSERT TO TREE========\n";
                        logTempText += "---DATE---\n" + new Date() + "\n";
                        logTempText += "---SQLCOMMAND---\n" + insertTreeSQL + "\n";
                        logTempText += "---RESULT---\n" + "success\n\n";
                        this.fs.appendFile("./history/dbAccessHistory.log", logTempText, (err) => {
                            if (err) console.log(err);
                            console.log("Successfully Written to dbAccessHistory.log.");
                        });

                        cb({
                            params: result,
                            change: max_change,
                            count_agg: count_agg,
                            sum_agg: sum_agg,
                            avg_agg: avg_agg
                        });
                    })
                })

            });
        })

    }

    insertDataToChangeTable(params, change, count_agg, sum_agg, avg_agg, user) {
        let sql = 'INSERT INTO "changes" (account, model, hierarchy, property, change, date_changed, user, active, tag, comment, change_hierarchy, count_agg, sum_agg, avg_agg, new_value, old_value, split_function_agg, aggregate_function_agg, start_date, end_date) VALUES (' + user.account + ',' + user.model + ',' + user.hierarchy + ',';
        sql += params.rowId.split("").slice(-1) + ",";
        sql += (change + 1) + ",strftime( '%Y-%m-%d', 'now' )," + user.user + ",1,2," + "'" + params.comment + "',";
        let tail = "," + count_agg.toString() + "," + sum_agg.toString() + "," + avg_agg.toString() + ",";
        tail += params.new_value_agg.toString() + ", " + params.old_value_agg.toString() + ",";
        tail += this.split_code[params.split_function_agg] + ", " + this.agg_code[params.aggregate_function_agg] + ",";
        tail += "'" + params.value_date_start + "', '" + params.value_date_end + "')";
        let tmp = params.rowId.split(",").slice(-14).map((el, id) => {
            if (id < 10 && parseInt(el) > -1) {
                return this.initDatas.csvDataOfProduct[0][id] + "=" + this.getStringVal("attribute" + (id + 1), parseInt(el)).string_val;
            }
            if (id < 13 && this.getStringVal("channel" + (id - 9), parseInt(el))) {
                return this.initDatas.csvDataOfChannel[0][id - 10] + "=" + this.getStringVal("channel" + (id - 9), parseInt(el)).string_val;
            }
            return "";
        });
        this._.remove(tmp, (el) => el.length === 0);
        let insertToChanges = sql + "'" + tmp + "'" + tail;
        console.log("---------------insertToChanges");
        console.log(insertToChanges);
        this.db.all(insertToChanges, (_err, results) => {

            let logTempText = "========INSERT TO CHANGES========\n";
            logTempText += "---DATE---\n" + new Date() + "\n";
            logTempText += "---SQLCOMMAND---\n" + insertToChanges + "\n";
            logTempText += "---RESULT---\n" + "success\n\n";
            this.fs.appendFile("./history/dbAccessHistory.log", logTempText, (err) => {
                if (err) console.log(err);
                console.log("Successfully Written to dbAccessHistory.log.");
            });

            console.log("insert to changes sucess");
        });
    }

    getInitDatas(cb) {
        let initDatasTmp = {};
        let startDate = "";
        let endDate = "";
        try {
            initDatasTmp['csvDataOfChannel'] = this.papa.parse(this.fs.readFileSync('./Datas/channel_hierarchy.csv').toString()).data;
            initDatasTmp['csvDataOfProduct'] = this.papa.parse(this.fs.readFileSync('./Datas/product_hierarchy.csv').toString()).data;
            initDatasTmp['csvDataOfPropertise'] = this.papa.parse(this.fs.readFileSync('./Datas/properties.csv').toString()).data;
            this.initDatas = initDatasTmp;

            this.db.all("SELECT * FROM code", (_err, results) => {
                this.codes = results;
                this.db.all("SELECT * FROM property", (_err, results) => {
                    this.property = results;
                    let tmp = [];
                    this.db.all("SELECT * FROM tree LIMIT 1;", (_err, results) => {
                        Object.keys(results[0]).map((data, id) => {
                            if (results[0][data] > -1 && id > 2 && id < 13) {
                                if (id == 3) {
                                    tmp.push({
                                        headerName: this.initDatas.csvDataOfProduct[0][id - 3],
                                        field: data,
                                        enableRowGroup: true,
                                        editable: false,
                                        suppressPaste: true,
                                        rowGroup: true
                                    });
                                } else {
                                    tmp.push({
                                        headerName: this.initDatas.csvDataOfProduct[0][id - 3],
                                        field: data,
                                        enableRowGroup: true,
                                        editable: false,
                                        suppressPaste: true
                                    });
                                }
                            }

                            if (results[0][data] > -1 && id > 12 && id < 16) {
                                tmp.push({
                                    headerName: this.initDatas.csvDataOfChannel[0][id - 13],
                                    field: data,
                                    enableRowGroup: true,
                                    editable: false,
                                    suppressPaste: true
                                });
                            }
                        });
                        // cb(tmp);
                        this.db.all("SELECT MIN(value_date) AS startDate,MAX(value_date) AS endDate FROM tree;", (_err, results) => {
                            startDate = results[0].startDate;
                            endDate = results[0].endDate;
                            this.db.all("SELECT * FROM property;", (_err, results) => {

                                let logTempText = "========GET INIT DATA========\n";
                                logTempText += "---DATE---\n" + new Date() + "\n";
                                logTempText += "---SQLCOMMAND---\n SELECT * FROM property;\n";
                                logTempText += "---RESULT---\n" + "success\n\n";
                                this.fs.appendFile("./history/dbAccessHistory.log", logTempText, (err) => {
                                    if (err) console.log(err);
                                    console.log("Successfully Written to dbAccessHistory.log.");
                                });

                                cb({
                                    colDefs: tmp,
                                    property: results,
                                    codes: this.codes,
                                    startDate: startDate,
                                    endDate: endDate
                                })
                            });
                        });
                    });
                });
            });
        } catch (error) {
            console.error(error);
        }
    }

    getData(request, cb) {
        let SQL = this.buildSql(request.request, request.extraDatas, request.dateForSelect);
        console.log("------------------getDataSQL");
        console.log(SQL);
        this.db.all(SQL, [], (_err, results) => {
            const resultsForPage = this.cutResultsToPageSize(request.request, results);
            const rowCount = this.getRowCount(request.request, results);
            resultsForPage.map(data => {
                Object.keys(data).map((key, id) => {
                    if ((key.indexOf("attribute") > -1) || (key.indexOf("channel") > -1)) {
                        let ans = this.getStringVal(key, data[key]);
                        if (ans) {
                            data[key] = ans.string_val;
                        }
                    }
                });
            });

            let logTempText = "========GET DATA========\n";
            logTempText += "---DATE---\n" + new Date() + "\n";
            logTempText += "---SQLCOMMAND---\n" + SQL + "\n";
            logTempText += "---RESULT---\n" + "success\n\n";
            this.fs.appendFile("./history/dbAccessHistory.log", logTempText, (err) => {
                if (err) console.log(err);
                console.log("Successfully Written to dbAccessHistory.log.");
            });

            cb(resultsForPage, rowCount);
        })
    }

    //  c
    buildSql(request, extraDatas, dateForSelect) {
        const selectSql = this.createSelectSql(request, extraDatas, dateForSelect);
        const whereSql = this.createWhereSql(request);
        const limitSql = this.createLimitSql(request);
        const orderBySql = this.createOrderBySql(request);
        const groupBySql = this.createGroupBySql(request);
        const joinSql = this.createJoinSql(request, extraDatas, whereSql, groupBySql);

        const SQL = selectSql + joinSql + whereSql + groupBySql + orderBySql + limitSql;
        return SQL;
    }

    // c
    createSelectSql(request, option, dateForSelect) {
        let rowGroupCols = request.rowGroupCols;
        let valueCols = request.valueCols;
        let groupKeys = request.groupKeys;
        let optionProperty = option.property;
        let visibleCol = option.visibleDate;

        let tempWhereSQL = " AND value_date = '" + dateForSelect + "' ";

        let keySQL = this.getKeySQL(request);

        if (this.isDoingGrouping(rowGroupCols, groupKeys)) {
            const colsToSelect = [];

            const rowGroupCol = rowGroupCols[groupKeys.length];
            colsToSelect.push(rowGroupCol.field);
            // if (plots) {
            //     valueCols.forEach(function(valueCol) {
            //         // query only visible cols
            //         if ((valueCol.aggFunc.toLowerCase() === "avg") || (valueCol.aggFunc.toLowerCase() === "sum")) {
            //             colsToSelect.push("ROUND(" + valueCol.aggFunc + "(" + valueCol.field + "), 2) as " + valueCol.field);
            //             colsToSelect.push("MAX(maxDate" + valueCol.field.slice(5, valueCol.field.length) + ") AS maxDate" + valueCol.field.slice(5, valueCol.field.length));
            //         } else {
            //             colsToSelect.push(valueCol.aggFunc + "(" + valueCol.field + ") as " + valueCol.field);
            //             colsToSelect.push("MAX(maxDate" + valueCol.field.slice(5, valueCol.field.length) + ") AS maxDate" + valueCol.field.slice(5, valueCol.field.length));
            //         }
            //     });
            // } else {
            valueCols.forEach(function(valueCol) {
                // query only visible cols
                if (visibleCol.indexOf(valueCol.field) != (-1)) {
                    if ((valueCol.aggFunc.toLowerCase() === "avg") || (valueCol.aggFunc.toLowerCase() === "sum")) {
                        colsToSelect.push("ROUND(" + valueCol.aggFunc + "(" + valueCol.field + "), 2) as " + valueCol.field);
                        colsToSelect.push("MAX(maxDate" + valueCol.field.slice(5, valueCol.field.length) + ") AS maxDate" + valueCol.field.slice(5, valueCol.field.length));
                    } else {
                        colsToSelect.push(valueCol.aggFunc + "(" + valueCol.field + ") as " + valueCol.field);
                        colsToSelect.push("MAX(maxDate" + valueCol.field.slice(5, valueCol.field.length) + ") AS maxDate" + valueCol.field.slice(5, valueCol.field.length));
                    }
                }
            });
            // }

            return " select '" + rowGroupCol.field + "' || ',' || attribute1 || ',' || attribute2 || ',' || attribute3 || ',' || attribute4 || ',' || attribute5 || ',' || attribute6 || ',' || attribute7 || ',' || attribute8 || ',' || attribute9 || ',' || attribute10 || ',' || channel1 || ',' || channel2 || ',' || channel3 || ',' || property as rowId, " + colsToSelect.join(", ") + ",account,model,hierarchy,user,active,tag FROM (SELECT *, " + keySQL.join("||','||") + " AS keys FROM tree WHERE active = 1 AND  property = " + optionProperty + tempWhereSQL + ") ";
        }

        return "select * from ( SELECT *, " + keySQL.join("||','||") + " AS keys, attribute1 || ',' || attribute2 || ',' || attribute3 || ',' || attribute4 || ',' || attribute5 || ',' || attribute6 || ',' || attribute7 || ',' || attribute8 || ',' || attribute9 || ',' || attribute10 || ',' || channel1 || ',' || channel2 || ',' || channel3 || ',' || property AS rowId FROM tree WHERE active = 1 AND property = " + optionProperty + tempWhereSQL + ") ";
    }

    // c
    createJoinSql(request, option, whereSql, groupBySql) {
        let aggfunction = option.aggfunction;
        let valueColumn = option.valueColumn;
        let dateRangeArray = option.dateRangeArray;
        let optionProperty = option.property;
        let visibleCol = option.visibleDate;

        let joinSqlTemp = "";
        let aggSQL = "";
        let joingroupbySQL = "";

        let keySQL = this.getKeySQL(request);
        if (option.showType === "Daily") {
            aggSQL = "ROUND (value,2) ";
            if (groupBySql.indexOf("GROUP BY") == -1) {
                joingroupbySQL = "GROUP BY attribute1 || ',' || attribute2 || ',' || attribute3 || ',' || attribute4 || ',' || attribute5 || ',' || attribute6 || ',' || attribute7 || ',' || attribute8 || ',' || attribute9 || ',' || attribute10 || ',' || channel1 || ',' || channel2 || ',' || channel3 ";
            } else {
                joingroupbySQL = groupBySql;
            }

        } else {
            aggSQL = aggfunction.toLowerCase() == "avg" ? "ROUND (" + aggfunction + "(value),2)" : " ROUND (" + aggfunction + "(value),2) ";
            if (groupBySql.indexOf("GROUP BY") == -1) {
                joingroupbySQL = "GROUP BY attribute1 || ',' || attribute2 || ',' || attribute3 || ',' || attribute4 || ',' || attribute5 || ',' || attribute6 || ',' || attribute7 || ',' || attribute8 || ',' || attribute9 || ',' || attribute10 || ',' || channel1 || ',' || channel2 || ',' || channel3 ";
            } else {
                joingroupbySQL = groupBySql;
            }
        }

        valueColumn.map((row, id) => {
            let rowTmp = row;
            let valId = rowTmp["field"].replace("value", "") * 1;
            if (visibleCol.indexOf("value" + (valId)) != (-1)) {
                joinSqlTemp += " INNER JOIN (    SELECT " + aggSQL + " AS value" + (valId) + " ," + keySQL.join("||','||") + " AS keys" + (valId) + ",MAX(date_created) AS maxDate" + (valId) + "     FROM tree  WHERE active = 1 AND value_date >= '" + dateRangeArray[valId - 1][0] + "' AND value_date <= '" + dateRangeArray[valId - 1][1] + "' AND property = " + optionProperty + whereSql.replace("WHERE", "AND") + joingroupbySQL + " ) ON (keys = keys" + (valId) + ") ";
            }
        });
        return joinSqlTemp;
    }

    createFilterSql(key, item) {
        switch (item.filterType) {
            case 'text':
                return this.createTextFilterSql(key, item);
            case 'number':
                return this.createNumberFilterSql(key, item);
            default:
                console.log('unkonwn filter type: ' + item.filterType);
        }
    }

    createNumberFilterSql(key, item) {
        switch (item.type) {
            case 'equals':
                return key + ' = ' + item.filter;
            case 'notEqual':
                return key + ' != ' + item.filter;
            case 'greaterThan':
                return key + ' > ' + item.filter;
            case 'greaterThanOrEqual':
                return key + ' >= ' + item.filter;
            case 'lessThan':
                return key + ' < ' + item.filter;
            case 'lessThanOrEqual':
                return key + ' <= ' + item.filter;
            case 'inRange':
                return '(' + key + ' >= ' + item.filter + ' and ' + key + ' <= ' + item.filterTo + ')';
            default:
                console.log('unknown number filter type: ' + item.type);
                return 'true';
        }
    }

    createTextFilterSql(key, item) {
        switch (item.type) {
            case 'equals':
                return key + ' = "' + item.filter + '"';
            case 'notEqual':
                return key + ' != "' + item.filter + '"';
            case 'contains':
                return key + ' like "%' + item.filter + '%"';
            case 'notContains':
                return key + ' not like "%' + item.filter + '%"';
            case 'startsWith':
                return key + ' like "' + item.filter + '%"';
            case 'endsWith':
                return key + ' like "%' + item.filter + '"';
            default:
                console.log('unknown text filter type: ' + item.type);
                return 'true';
        }
    }

    // c
    createWhereSql(request) {
        const rowGroupCols = request.rowGroupCols;
        const groupKeys = request.groupKeys;
        const filterModel = request.filterModel;

        const that = this;
        const whereParts = [];

        if (groupKeys.length > 0) {
            groupKeys.forEach(function(key, index) {
                const colName = rowGroupCols[index].field;

                whereParts.push(colName + " = '" + that.getIntVal(colName, key) + "'");
            });
        }

        if (filterModel) {
            const keySet = Object.keys(filterModel);
            keySet.forEach(function(key) {
                const item = filterModel[key];
                whereParts.push(that.createFilterSql(key, item));
            });
        }

        if (whereParts.length > 0) {
            return " WHERE " + whereParts.join(" and ");
        } else {
            return " ";
        }
    }

    // c
    createGroupBySql(request) {
        const rowGroupCols = request.rowGroupCols;
        const groupKeys = request.groupKeys;

        if (this.isDoingGrouping(rowGroupCols, groupKeys)) {
            const colsToGroupBy = [];

            const rowGroupCol = rowGroupCols[groupKeys.length];
            colsToGroupBy.push(rowGroupCol.field);

            return " GROUP BY " + colsToGroupBy.join(", ") + "";
        } else {
            // select all columns
            return "";
        }
    }

    getKeySQL(request) {
        const rowGroupCols = request.rowGroupCols;
        const groupKeys = request.groupKeys;

        if (this.isDoingGrouping(rowGroupCols, groupKeys)) {
            const colsToGroupBy = [];

            const rowGroupCol = rowGroupCols[groupKeys.length];
            colsToGroupBy.push(rowGroupCol.field);

            return colsToGroupBy;
        } else {
            // select all columns
            return ["attribute1 || ',' || attribute2 || ',' || attribute3 || ',' || attribute4 || ',' || attribute5 || ',' || attribute6 || ',' || attribute7 || ',' || attribute8 || ',' || attribute9 || ',' || attribute10 || ',' || channel1 || ',' || channel2 || ',' || channel3"];
        }
    }

    // c
    createOrderBySql(request) {
        const rowGroupCols = request.rowGroupCols;
        const groupKeys = request.groupKeys;
        const sortModel = request.sortModel;

        const grouping = this.isDoingGrouping(rowGroupCols, groupKeys);

        const sortParts = [];
        if (sortModel) {

            const groupColIds =
                rowGroupCols.map(groupCol => groupCol.id)
                .slice(0, groupKeys.length + 1);

            sortModel.forEach(function(item) {
                if (grouping && groupColIds.indexOf(item.colId) < 0) {
                    // sort when grouping
                    sortParts.push(item.colId + " " + item.sort);
                } else {
                    // sort items
                    sortParts.push(item.colId + " " + item.sort);
                }
            });
        }

        if (sortParts.length > 0) {
            return " order by " + sortParts.join(", ");
        } else {
            return "";
        }
    }

    // u
    isDoingGrouping(rowGroupCols, groupKeys) {
        return rowGroupCols.length > groupKeys.length;
    }

    // u
    createLimitSql(request) {
        const startRow = request.startRow;
        const endRow = request.endRow;
        const pageSize = endRow - startRow;
        return " limit " + (pageSize + 1) + " offset " + startRow;
    }

    getRowCount(request, results) {
        if (results === null || results === undefined || results.length === 0) {
            return null;
        }
        const currentLastRow = request.startRow + results.length;
        // return results.length <= request.endRow ? results.length : -1;
        return currentLastRow <= request.endRow ? currentLastRow : -1;
    }

    cutResultsToPageSize(request, results) {
        const pageSize = request.endRow - request.startRow;
        if (results && results.length > pageSize) {
            return results.slice(0, pageSize);
        } else {
            return results;
        }
    }

    getIntVal(code_type, int_val) {
        let condition = {};
        condition.code_type = code_type;
        condition.string_val = int_val;
        let res = this._.find(this.codes, condition);
        console.log(this.codes);
        return res.string_val;
    }

    getStringVal(code_type, int_val) {
        let tmp = {};
        tmp['code_type'] = code_type;
        tmp['int_val'] = int_val;
        return this._.find(this.codes, tmp);
    }

    getHistoryLast50(params, cb) {
        let whereSQL = " value_date >= '" + params.startDate + "' AND value_date <= '" + params.endDate + "' ";
        if (params.groupBy.length > 0) {
            let groupByProp = params.groupBy;
            groupByProp.map(row => {
                let groupByIntVal = params[row];
                whereSQL += " AND " + row + " = " + groupByIntVal;
            });
        } else {
            Object.keys(params).map(row => {
                if ((row.indexOf("attribute") != -1) || (row.indexOf("channel") != -1)) {
                    whereSQL += " AND " + row + " = " + params[row];
                }
            });
        }
        whereSQL += " AND property = " + params.property + " AND account = " + params.account + " AND model = " + params.model + " AND hierarchy = " + params.hierarchy;

        let sql0 = "SELECT * FROM changes INNER JOIN users ON changes.user = users.user WHERE change IN (SELECT DISTINCT change FROM Tree WHERE active = 0 AND " + whereSQL + ") ORDER BY change DESC";
        let sql1 = "SELECT * FROM changes INNER JOIN users ON changes.user = users.user WHERE change IN (SELECT DISTINCT change FROM Tree WHERE active = 1 AND " + whereSQL + ") ORDER BY change DESC";

        console.log(sql0);
        console.log(sql1);
        this.db.all(sql0, (err, result) => {
            let firstresult = result;
            this.db.all(sql1, (err, result) => {
                if (!err) {
                    cb([...result, ...firstresult], null);
                } else {
                    cb(false, err);
                }
            })

        })
    }

    registerUser(userData, cb) {
        let that = this;
        this.db.all("SELECT username FROM users WHERE username=?", [userData.username], (_err, results) => {
            if (results.length > 0) {
                cb(false);
            } else {
                this.bcrypt.genSalt(10, function(err, salt) {
                    that.bcrypt.hash(userData.password1, salt, function(err, hash) {
                        // Store hash in your password DB.
                        that.db.prepare("INSERT INTO users (username, password_hash, account, model, hierarchy, active) VALUES (?,?,0,0,0,1)", [userData.username, hash]).run(_err => {
                            if (!_err) {
                                cb(true);
                            }
                        });
                    });
                });
            }
        })
    }

    findUser(userData, cb) {
        this.db.all("SELECT * FROM users WHERE username = ?", [userData.username], (_err, results) => {
            if (_err || results.length <= 0) {
                cb(false)
            } else {
                this.bcrypt.compare(userData.password, results[0].password_hash, function(err, result) {
                    cb(result, results[0]);
                });
            }
        })
    }

    findUserByName(userData, cb) {
        this.db.all("SELECT * FROM users WHERE username = ?", [userData.username], (_err, results) => {
            if (_err || results.length <= 0) {
                cb(false)
            } else {
                cb(true, results[0]);
            }
        })
    }

    createSQLForTSP(time, count, params, response) {
        // return "select " + time + ", sum(value) from tree where active=1 and property=? and value_date >= ? and value_date <= ? and attribute1 = ? and attribute2 = ? and attribute3 = ? and attribute4 = ? andattribute5 = ? andattribute6 = ? and attribute7 = ? and attribute8 = ? and attribute9 = ? and attribute10 = ? and channel1 = ? and channel2 = ? and channel3 = ? group by strftime('%Y-%m', value_date) having count(distinct value_date) >= " + count;
        let sql = typeof params.selected === "object" ? `select ${time} as x, ${params.aggFunc}(value) as value from tree where active=1 and property=? and value_date >= ? and value_date <= ? and attribute1 = ? and attribute2 = ? and attribute3 = ? and attribute4 = ? and attribute5 = ? and attribute6 = ? and attribute7 = ? and attribute8 = ? and attribute9 = ? and attribute10 = ? and channel1 = ? and channel2 = ? and channel3 = ? group by x having count(distinct value_date) >= ${count}`:`select ${time} as x, ${params.aggFunc}(value) as value from tree where active=1 and property=? and value_date >= ? and value_date <= ? and ${params.selected} group by x having count(distinct value_date) >= ${count}`;
        console.log(sql);
        let condition = typeof params.selected === "object" ? [params.v1, params.startDate, params.endDate, ...params.selected] : [params.v1, params.startDate, params.endDate];
        console.log(condition);
        if (params.v1 > 0) {
            this.db.all(sql, condition, (err, result1) => {
                if (err) {
                    response.json({ result: "error", error: err })
                } else if (params.v1 !== params.v2 || params.v2 < 0) {
                    this.db.all(sql, [params.v2, params.startDate, params.endDate, ...params.selected], (err, result2) => {
                        console.log(result1);
                        response.json({
                            result1,
                            result2
                        })
                    })
                } else {
                    response.json({
                        result1,
                        result2: null
                    });
                }
            });
        }
    }

    getDataForTSP(params, response) {
        console.log(params);
        switch (params.time_segment) {
            case "Daily":
                this.createSQLForTSP("strftime('%Y-%m-%d',value_date)", 1, params, response);
                break;
            case "Weekly":
                this.createSQLForTSP("strftime('%Y', value_date)||'-W'||cast(strftime('%W', value_date) AS TEXT)", 7, params, response);
                break;
            case "Monthly":
                this.createSQLForTSP("strftime('%Y-%m', value_date)", 28, params, response);
                break;
            case "Quarterly":
                this.createSQLForTSP("strftime('%Y', value_date)||'-Q'||cast(((strftime('%m', value_date) + 2)/3) AS TEXT)", 87, params, response);
                break;
            case "Yearly":
                this.createSQLForTSP("strftime('%Y', value_date)", 364, params, response);
                break;
        }
        return "";
    }

    getDataForBDP(params, response) {
        console.log(params);
        // attribute1,attribute2,attribute3,attribute4,attribute5,attribute6,attribute7,attribute8,attribute9,attribute10,channel1,channel2,channel3,
        // attribute1=? and attribute2=? and attribute3=? and attribute4=? and attribute5=? and attribute6=? and attribute7=? and attribute8=? and attribute9=? and attribute10=? and channel1=? and channel2=? and channel3=? and 
        let sql = "select attribute1,attribute2,attribute3,attribute4,attribute5,attribute6,attribute7,attribute8,attribute9,attribute10,channel1,channel2,channel3,sum(value) as y from tree where active=1 and property=? and value_date>=? and value_date<=? group by " + params.lastGrouped;
        if (params.v1 > 0) {
            this.db.all(sql, [params.v1, params.startDate, params.endDate], (err, result1) => {
                if (err) {
                    console.log(err);
                    response.json({ result: "error", error: err });
                } else if (params.v1 !== params.v2 || params.v2 < 0) {
                    this.db.all(sql, [params.v2, params.startDate, params.endDate], (err, result2) => {
                        response.json({
                            result: "success",
                            result1,
                            result2
                        })
                    })
                } else {
                    response.json({
                        result: "success",
                        result1,
                        result2: null
                    });
                }
            })
        }
    }
}

module.exports = new DataService();