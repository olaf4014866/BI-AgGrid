let grid = GridStack.init({
    removable: '.trash',
    removeTimeout: 100,
    verticalMargin: 3
});
grid.on('removed', function(e, items) { console.log('removed ', items) });
let gridStackInfo;

let saveLayoutBtn = document.getElementById("saveLayoutBtn");
let resetLayoutBtn = document.getElementById("resetLayoutBtn");

// save state of gird to localstorage
saveLayoutBtn.addEventListener("click", function() {
    localStorage.setItem("gridstack_layout", JSON.stringify({ info: gridStackInfo }));
    let optionTemp = {
        start_date: document.getElementById("startDate").value,
        end_date: document.getElementById("endDate").value,
        property: document.getElementById("property").value,
        split_function: document.getElementById("split").value,
        time_series_plots: { test: "test" },
        breakdown_plots: { test: "test" }
    };
    localStorage.setItem("selections_layout", JSON.stringify(optionTemp));
});

resetLayoutBtn.addEventListener("click", resetLayout);

// when load page if there is gridstack_layout in localstorage
// get info and draw with that data
// else draw with default data
if (localStorage.getItem("gridstack_layout")) {
    gridStackInfo = JSON.parse(localStorage.getItem("gridstack_layout")).info;
    grid.batchUpdate();
    gridStackInfo.map(row => {
        grid.update(document.getElementById(row.id), row.x, row.y, row.width, row.height);
    });
    grid.commit();
} else {
    let defaultGridStackData = {
        info: [
            { id: "gridOptinsDiv", x: 0, y: 0, width: 12, height: 1 },
            { id: "agGridDiv", x: 0, y: 1, width: 12, height: 6 },
            { id: "timeSeriesPlotsDiv", x: 0, y: 7, width: 6, height: 2 },
            { id: "breakDownPlotsDiv", x: 6, y: 7, width: 6, height: 2 },
            { id: "formulasDiv", x: 0, y: 9, width: 2, height: 1 },
            { id: "importDiv", x: 2, y: 9, width: 2, height: 1 },
            { id: "layoutDiv", x: 4, y: 9, width: 4, height: 1 }

        ]
    };
    gridStackInfo = defaultGridStackData.info;
    localStorage.setItem("gridstack_layout", JSON.stringify(defaultGridStackData));
    grid.batchUpdate();
    gridStackInfo.map(row => {
        grid.update(document.getElementById(row.id), row.x, row.y, row.width, row.height);
    });
    grid.commit();
}

// when grid chages
grid.on('change', function(event, items) {
    if ((items !== undefined) && (event.type === "change")) {
        items.map(item => {
            gridStackInfo.map((row) => {
                if (row.id == item.el.id) {
                    console.log("test")
                    row.width = item.width;
                    row.height = item.height;
                    row.x = item.x;
                    row.y = item.y;
                }
            });
        })
    }
});

// reset layout to default
function resetLayout() {
    let defaultGridStackData = {
        info: [
            { id: "gridOptinsDiv", x: 0, y: 0, width: 12, height: 1 },
            { id: "agGridDiv", x: 0, y: 1, width: 12, height: 6 },
            { id: "timeSeriesPlotsDiv", x: 0, y: 7, width: 6, height: 2 },
            { id: "breakDownPlotsDiv", x: 6, y: 7, width: 6, height: 2 },
            { id: "formulasDiv", x: 0, y: 9, width: 2, height: 1 },
            { id: "importDiv", x: 2, y: 9, width: 2, height: 1 },
            { id: "layoutDiv", x: 4, y: 9, width: 4, height: 1 }
        ]
    };
    localStorage.setItem("gridstack_layout", JSON.stringify(defaultGridStackData));
    gridStackInfo = defaultGridStackData.info;
    grid.batchUpdate();
    gridStackInfo.map(row => {
        console.log("dd")
        grid.update(document.getElementById(row.id), row.x, row.y, row.width, row.height);
    });
    grid.commit();
    localStorage.removeItem("selections_layout");
}

function closeGridStack(e) {
    grid.batchUpdate();
    grid.removeWidget( e.parentElement.parentElement.parentElement);
    e.parentElement.parentElement.parentElement.remove();
    grid.commit();
}