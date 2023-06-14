import fs from 'fs';

export default function genHTMLReport(url, ls) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `report_${url.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.html`;

  let html = `
    <html>
      <head>
        <title>Link Checker Report</title>
        <style>
       /* Reset styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Global styles */
body {
  font-family: Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
  background-color: #f5f5f5;
}

h1, h2 {
  margin-top: 20px;
  margin-bottom: 10px;
}

a {
  color: #007bff;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Table styles */
table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 20px;
}

th, td {
  text-align: left;
  padding: 8px;
  border: 1px solid black;
}

th {
  background-color: #ddd;
}

.warning td {
  background-color: #ffffcc;


}

.warning a {

}

.warning a:hover {
  text-decoration: underline;
}

.content-type,
.canonical-header,
.canonical-static,
.title-static {
  font-family: monospace;
}

.content-type {
  text-transform: uppercase;
}
        </style>
      </head>
      <body>
        <h1>Link Checker Report</h1>
        <p>Crawled URL: <a href="${url}" target="_blank">${url}</a></p>
        <p>Crawl Time: ${new Date().toLocaleString()}</p>
  `;

  let statusCodes = Object.values(ls).map(obj => obj.sc);
  statusCodes = [...new Set(statusCodes)];
  statusCodes.sort((a, b) => b - a);

  for(let sc of statusCodes) {
    html += `
      <h2>HTTP ${sc}</h2>
      <table>
        <thead>
          <tr>
            <th>URL</th>
            <th>Status Code</th>
            <th>Warnings</th>
            ${sc >= 300 && sc < 400 ? `<th>Redirect URL</th>` : ''}
            ${sc >= 200 && sc < 300 ? `<th>Content Type</th><th>Canonical Header</th><th>Canonical Static</th><th>Title Static</th><th>Canonical Rendered</th><th>Title Rendered</th>` : ''}
            
            </tr>
        </thead>
        <tbody>
    `;
    for(let [lnk, statusObj] of Object.entries(ls)) {
      if(statusObj.sc == sc) {
        let warning = '';
        let rowColor = '';
        if (statusObj.hasOwnProperty('canonicalHeaderMatch') && statusObj.canonicalHeaderMatch === false) {
            warning += '⚠️ Canonical Header Mismatch. ';
            rowColor = 'red';
        }
        if (statusObj.hasOwnProperty('canonicalStaticMatch') && statusObj.canonicalStaticMatch === false) {
            warning += '⚠️ Canonical Static Mismatch. ';
            rowColor = 'red';
        }
        if (statusObj.hasOwnProperty('hasSEOTitle') && statusObj.hasSEOTitle === false) {
            warning += '⚠️ Missing SEO Title. ';
            rowColor = 'red';
        }

            // Add warnings for additional checks from analyzer.js
    if (statusObj.hasOwnProperty('renderedCanonicalMatch') && statusObj.renderedCanonicalMatch === false) {
      warning += '⚠️ Rendered Canonical Mismatch. ';
      rowColor = 'red';
  }

  if (statusObj.hasOwnProperty('titleMatch') && statusObj.titleMatch === false) {
      warning += '⚠️ Title Mismatch. ';
      rowColor = 'red';
  }

  if (statusObj.hasOwnProperty('canonicalMatch') && statusObj.canonicalMatch === false) {
      warning += '⚠️ Canonical Mismatch. ';
      rowColor = 'red';
  }

        html += `
        <tr class="${warning ? 'warning' : ''}">
            <td><a href="${lnk}" target="_blank">${lnk}</a></td>
            <td>${statusObj.sc}</td>
            <td>${warning}</td>
            ${sc >= 300 && sc < 400 ? `<td>${statusObj.redirUrl ? `<a href="${statusObj.redirUrl}" target="_blank">${statusObj.redirUrl}</a>` : 'N/A'}</td>` : ''}
            ${sc >= 200 && sc < 300 ? `<td>${statusObj.contentType || 'N/A'}</td><td>${statusObj.canonicalHeader || 'N/A'}</td><td>${statusObj.canonicalStatic || 'N/A'}</td><td>${statusObj.titleStatic || 'N/A'}</td><td>${statusObj.canonicalRendered || 'N/A'}</td><td>${statusObj.titleRendered || 'N/A'}</td>` : ''}
            </tr>
        `;
      }
    }
    html += `</tbody></table>`;
  }
  html += `</body></html>`;

  fs.writeFileSync(filename, html);
  console.log("HTML Report Generated: " + filename);
  return filename;
}