const sheetId = '1xXzhwZesegYGRXn_YRmfqHuSmJQcIFSIXp6uHeacius';
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const sheetName = 'user-data';
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
 
function processRows(json) {
  json.forEach((row) => {
      const tr = document.createElement('tr');
      const keys = Object.keys(row);
  
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
      })
      output.appendChild(tr);
  })
}

// Function to check if a string is a valid URL
function isURL(str) {
  const pattern = /^(https?|ftp|file):\/\/[^\s/$.?#].[^\s]*$/;
  return pattern.test(str);
}

// Function to show the image tooltip
function showImageTooltip(url) {
  const tooltip = document.querySelector('.tooltip');
  const image = document.createElement('img');
  image.src = url;
  tooltip.innerHTML = '';
  tooltip.appendChild(image);
  tooltip.style.display = 'block';
}

// Function to hide the tooltip
function hideTooltip() {
  const tooltip = document.querySelector('.tooltip');
  tooltip.style.display = 'none';
}


