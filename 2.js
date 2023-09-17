const sheetId = '1378-w6EsdCVsaU6xkx9voDxWOF2eNBywt5HHkrVKs_4';
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const sheetName = 'Archive_ziro';
const query = encodeURIComponent('Select *')
const url = `${base}&sheet=${sheetName}&tq=${query}`
const data = []
document.addEventListener('DOMContentLoaded', init)
const output = document.querySelector('.output')

// loads the google sheets data on page load.
function init() {
    fetch(url)
        .then(res => res.text())
        .then(rep => {
            //Remove additional text and extract only JSON:
            const jsonData = JSON.parse(rep.substring(47).slice(0, -2));
            console.log(rep)
            const colz = [];
            const tr = document.createElement('tr');
            //Extract column labels
            jsonData.table.cols.forEach((heading) => {
                if (heading.label) {
                    let column = heading.label;
                    colz.push(column);
                    const th = document.createElement('th');
                    th.innerText = column;
                    tr.appendChild(th);
                }
            })
            output.appendChild(tr);
            //extract row data:
            jsonData.table.rows.forEach((rowData) => {
                const row = {};
                colz.forEach((ele, ind) => {
                    row[ele] = (rowData.c[ind] != null) ? rowData.c[ind].v : '';
                })
                data.push(row);
            })
            processRows(data);
        })
}

// Function to filter and display rows based on search keyword
function processRows(json) {
    const searchInput = document.querySelector('#search-input');
    const searchButton = document.querySelector('#search-button');

    // Create a function to display all rows without filtering
    function displayAllRows() {
        output.innerHTML = ''; // Clear the existing table rows
        json.forEach((row) => {
            const keys = Object.keys(row);
            const tr = document.createElement('tr');
            keys.forEach((key, index) => {
                const td = document.createElement('td');
                // Check if it's the third column and create a link if it's a URL
                if (index === 2 && isURL(row[key])) {
                    const link = document.createElement('a');
                    link.href = row[key];
                    link.textContent = row[key];
                    td.appendChild(link);
                } else {
                    td.textContent = row[key];
                }
                tr.appendChild(td);
            });
            output.appendChild(tr);
        });
    }

    // Initial display (show all rows)
    displayAllRows();

    // Handle Enter key press
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission

            const searchTerm = searchInput.value.toLowerCase();

            // Clear the existing table rows
            output.innerHTML = '';

            // If the search term is empty, display all rows
            if (searchTerm === '') {
                displayAllRows();
                return;
            }

            json.forEach((row) => {
                const keys = Object.keys(row);
                const matchesSearchTerm = keys.some((key) => {
                    return row[key].toLowerCase().includes(searchTerm);
                });

                if (matchesSearchTerm) {
                    const tr = document.createElement('tr');
                    keys.forEach((key, index) => {
                        const td = document.createElement('td');
                        // Check if it's the third column and create a link if it's a URL
                        if (index === 3 && isURL(row[key])) {
                            const link = document.createElement('a');
                            link.href = row[key];
                            link.textContent = row[key];
                            td.appendChild(link);
                        } else {
                            td.textContent = row[key];
                        }
                        tr.appendChild(td);
                    });
                    output.appendChild(tr);
                }
            });
        }
    });
}

// Function to check if a string is a valid URL
function isURL(str) {
    const pattern = /^(https?|ftp|file):\/\/[^\s/$.?#].[^\s]*$/;
    return pattern.test(str);
}

