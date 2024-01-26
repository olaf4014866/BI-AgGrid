class CustomStatusBarComponent {
    constructor() {}
    init(params) {
        this.eGui = document.createElement('div');
        this.eGui.className = 'ag-name-value';
        let label1 = document.createElement('span');
        label1.id = 'o_n_values';
        let label2 = document.createElement('span');
        label2.id = 'affectedCols';
        this.eGui.appendChild(label1);
        this.eGui.appendChild(label2);
    }
    getGui() {
        return this.eGui;
    }
}