let ONE_DAY = 1000 * 60 * 60 * 24;
let cellChangeFlag = false;
let formula = "";

function addProperty(data, id, flag = false) {
    let opt = document.createElement('option');
    opt.value = data.property1;
    opt.setAttribute('idx', id);
    opt.setAttribute('aggfunc', data.property3);
    opt.setAttribute('splitfunc', data.property4);
    opt.innerHTML = data.property1;
    opt.selected = flag;
    return opt;
}

function addOptions(select, func) {
    let opt = document.createElement('option');
    opt.value = func;
    opt.innerHTML = func;
    select.appendChild(opt);
}

function prepareDate(d) {
    return d.split("-").map((d, id) => {
        if (id === 1) {
            return parseInt(d) - 1;
        }
        return d;
    });
}

function addComment() {
    extraDatas.editComment = document.getElementById("commentarea").value;
}

// get week from date input date style default
function getWeek(e) {
    var date = new Date(e);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    var week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// convert date format to "2020-02-09" style
function convertToDate(d) {
    let year = d.getFullYear();
    let month = d.getMonth() + 1;
    let day = d.getDate();

    month = ("0" + month).slice(month.toString().length - 1);
    day = ("0" + day).slice(day.toString().length - 1);

    return [year, month, day].join("-");
}

// generate input string to number
// "20*8-56" -> 104
function calculateString(params) {
    formula = params.newValue;
    let check = /[a-z,`~?!@#$'";:^&]/i;
    if (!check.test(params.newValue)) {
        cellChangeFlag = true;
        return parseFloat(eval(params.newValue));
    } else {
        console.log(" Can't calculate Input string");
        return parseFloat(params.oldValue);
    }
}

// generate cell backgroundcolor
// upto 7 days grey else original
function getBackColor(params) {
    if (cellChangeFlag) {
        cellChangeFlag = false;
        return "#45494a";
    } else {
        let createdDate = new Date(params.data["maxDate" + params.colDef.field.slice(5, params.colDef.field.length)]);
        let nowDate = new Date(getNowDate());
        if ((nowDate.getTime() - createdDate.getTime()) <= (ONE_DAY * 7)) {
            return "#45494a";
        }
    }
}

// get year from date input date style default
function getWeekYear(e) {
    var date = new Date(e);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    return date.getFullYear();
}

// get quarter from date input date style: '2020-02-02' type 
// output style : 2020-Q1
function getQuarter(e) {
    let month = convertToDate(e).slice(5, 7);
    let year = convertToDate(e).slice(0, 4);
    if (month <= 3 && month >= 1) {
        return year + "-Q" + 1;
    }
    if (month <= 6 && month >= 4) {
        return year + "-Q" + 2;
    }
    if (month <= 9 && month >= 7) {
        return year + "-Q" + 3;
    }
    if (month <= 12 && month >= 10) {
        return year + "-Q" + 4;
    }
}

// getDateCount
function getDateCount(startdate, enddate) {
    let start = new Date(startdate);
    let end = new Date(enddate);
    start = start.getTime();
    end = end.getTime();
    return Math.abs(start - end) / ONE_DAY + 1;
}

// get today date, return style: 2020-02-03
function getNowDate() {
    let nowDate = new Date();
    let createdDate = nowDate.getFullYear() + "-";
    let nowMonth = "00" + (nowDate.getMonth() + 1);
    nowMonth = nowMonth.slice(nowMonth.length - 2, nowMonth.length);
    createdDate += nowMonth + "-";
    let nowDay = "00" + nowDate.getDate();
    createdDate += nowDay.slice(nowDay.length - 2, nowDay.length);
    return createdDate;
}

// get int val from string val and codetype
function getIntVal(codeType, stringVal) {
    for (var i = 0; i < tableCode.length; i++) {
        if ((tableCode[i]["code_type"] == codeType) && (tableCode[i]["string_val"] == stringVal)) {
            return tableCode[i]["int_val"];
        }
    }
    return stringVal;
}

// get string value from int val and codetype
function getStringVal(codeType, intVal) {
    if ((codeType.slice(0, codeType.length - 1) == "attribute") || (codeType.slice(0, codeType.length - 1) == "channel")) {
        for (var i = 0; i < tableCode.length; i++) {
            if ((tableCode[i]["code_type"] == codeType) && (tableCode[i]["int_val"] == intVal)) {
                return tableCode[i]["string_val"];
            }
        }
    } else {
        return false;
    }
}