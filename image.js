var http = require('http');
var fs = require('fs');
var url = require('url');
 
var app = http.createServer(function(request,response){
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var title = queryData.id;
    if(_url == '/'){
      title = 'Welcome';
    }
    if(_url == '/favicon.ico'){
      return response.writeHead(404);
    }
    response.writeHead(200);
    fs.readFile(`data/${queryData.id}`, 'utf8', function(err, description){
      var template = `
      <!DOCTYPE html>
      <html>
      <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="stylesheet" href="style.css">
      
      
      </head>
      <body>
          <div class="box">
              <div class="title">
                LIBRARY
              </div>
            
              <div class="index">
                <a href="index.html"> INDEX</a> /  <a href="image.html"> IMAGE</a>
                
              </div>
            </div>
            
            <div class="category">
            <div class="1">
              COLLECTION </div><br><br>
          <div class="collection">
              <img src="./images/https___www_jiho6693_com_.jpg">
              <img src="./images/https___adnauseam_io_.jpg">
              <img src="./images/https___decolonizethisplace_org_.jpg">
              <img src="./images/https___rhizome_org_tags_preservation_.jpg">
              <img src="./images/https___thebooksociety_org_.jpg">
              <img src="./images/https___web_archive_org_.jpg">
              <img src="./images/https___www_nga_gov_open_access_images_html.jpg">
              <img src="./images/https___www_webdesignmuseum_org_.jpg">
              <img src="./images/https___www_printedmatter_org_.jpg">
              <img src="./images/https___www_vdrome_org_.jpg">
              <img src="./images/https___www_olympiagallery_org_2019_poster_105_Sam_de_Groot_lecture_.jpg">
              <img src="./images/https___www_ryojiikeda_com_.jpg">
              <img src="./images/https___0100101110101101_org_.jpg">
              <img src="./images/https___www_itsnicethat_com_articles_junwoo_park_discover_illustration_140323.jpg">
          </div>
          <div id="imageContainer"></div>
        </body>
       </html> 
          
      `;
      response.end(template);
    })
 
 
});
app.listen(3000);