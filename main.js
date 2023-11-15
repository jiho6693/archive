                           const sheetId = '1378-w6EsdCVsaU6xkx9voDxWOF2eNBywt5HHkrVKs_4';
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const sheetName = 'Archive_ziro';
const query = encodeURIComponent('Select *')
const url = `${base}&sheet=${sheetName}&tq=${encodeURIComponent('Select *')}`;
const data = []
const output = document.querySelector('.output')
const searchInput = document.querySelector('#search-input');
document.addEventListener('DOMContentLoaded', init)


// loads the google sheets data on page load.
function init() {
    fetch(url)
        .then(res => res.text())
        .then(rep => {
            // Remove additional text and extract only JSON:
            const jsonData = JSON.parse(rep.substring(47).slice(0, -2));
            console.log(rep);
            const colz = [];
            const tr = document.createElement('tr');
            // Extract column labels
            jsonData.table.cols.forEach((heading) => {
                if (heading.label) { // 가져올 열의 수를 제한
                    let column = heading.label;
                    colz.push(column);
                    const th = document.createElement('th');
                    th.innerText = column;
                    tr.appendChild(th);
                }
                
            });
            output.appendChild(tr);

            // Extract and display only the first 4 columns
            jsonData.table.rows.forEach((rowData) => {
                const row = {};
                colz.forEach((ele, ind) => {
                    if (ind < 4) {
                        row[ele] = (rowData.c[ind] != null) ? rowData.c[ind].v : '';
                    }
                });
                data.push(row);
            });
            processRows(data);
        });
}

// Function to highlight row on mouseover
function highlightRowOnMouseOver(row) {
    row.classList.add('highlighted-row'); // CSS 클래스를 추가하여 행의 스타일을 변경
}

// Function to remove highlighting on mouseout
function removeHighlightOnMouseOut(row) {
    row.classList.remove('highlighted-row'); // CSS 클래스를 제거하여 행의 스타일을 원래대로 되돌림
}

// Function to filter and display rows based on search keyword
function processRows(json) {
  
    const searchButton = document.querySelector('#search-button');

    // Create a function to display all rows without filtering
    function displayAllRows() {
        output.innerHTML = ''; // Clear the existing table rows
    
        json.forEach((row) => {
            const keys = Object.keys(row);
            const tr = document.createElement('tr');

            

            // Add event listeners for mouseover and mouseout
            tr.addEventListener('mouseover', () => {
                highlightRowOnMouseOver(tr);
            });
    
            tr.addEventListener('mouseout', () => {
                removeHighlightOnMouseOut(tr);
            });
    

            keys.forEach((key, index) => {
                const td = document.createElement('td');
                // Check if it's the third column and create a link if it's a URL
                if (index === 2 && isURL(row[key])) {
                    const link = document.createElement('a');
                    link.href = row[key];
                    link.target = "_blank";
                    const maxLength = 35;
                    link.textContent = row[key].length > maxLength ? row[key].substring(0, maxLength) + '...' : row[key];
                    td.appendChild(link);
                } else {
                    const maxLength = 35;
                    td.textContent = row[key].length > maxLength ? row[key].substring(0, maxLength) + '...' : row[key];
                }

                 // Apply fixed column widths
                 if (index === 0) {
                    td.style.width = '20%'; // 첫 번째 열은 100px로 고정
                } else if (index === 1) {
                    td.style.width = '25%'; // 두 번째 열은 500px로 고정
                } else if (index === 2) {
                    td.style.width = '40%'; // 세 번째 열은 700px로 고정
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
                        if (index === 2 && isURL(row[key])) {
                            const link = document.createElement('a');
                            link.href = row[key];
                            link.target = "_blank";
                            // Trim the text to a maximum length (e.g., 100 characters)
                            const maxLength = 35;
                            link.textContent = row[key].length > maxLength ? row[key].substring(0, maxLength) + '...' : row[key];
                            td.appendChild(link);
                        } else {
                            // Trim the text to a maximum length for other columns (e.g., 500 characters)
                            const maxLength = 35;
                            td.textContent = row[key].length > maxLength ? row[key].substring(0, maxLength) + '...' : row[key];
                        }

                        // Apply fixed column widths
                        if (index === 0) {
                            td.style.width = '20%'; // 첫 번째 열은 100px로 고정
                        } else if (index === 1) {
                            td.style.width = '25%'; // 두 번째 열은 500px로 고정
                        } else if (index === 2) {
                            td.style.width = '40%'; // 세 번째 열은 700px로 고정
                        }

                        tr.appendChild(td);
                    });
                    output.appendChild(tr);
                }
            });
        }
    });
}

function isURL(str) {
    try {
        new URL(str);
        return true;
    } catch (error) {
        return false;
    }
}

