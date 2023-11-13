const express = require('express');
const app = express();
const path = require('path');

const imagePath = path.join(__dirname, './images'); // 이미지가 있는 폴더 경로

app.use(express.static(imagePath)); // 이미지 폴더를 정적으로 서빙

app.get('/getImages', (req, res) => {
    // 이미지 폴더에서 파일 목록을 가져오기
    const fs = require('fs');
    fs.readdir(imagePath, (err, files) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.send(files);
        }
    });
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
