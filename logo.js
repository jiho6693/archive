function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    noStroke();
  }
  
  function draw() {
    background(255, 0);
  
    // 우측에서 비추는 오렌지색 포인트 라이트
    pointLight(150, 100, 0, 500, 0, 200);
  
    // 좌측에서 비추는 파랑색 디렉셔널 라이트
    directionalLight(0, 102, 255, -1, 0, 0);
  
    // 정면에서 비추는 노랑색 스포트라이트
    pointLight(255, 255, 109, 0, 0, 300);
  
    rotateY(map(mouseX, 0, width, 0, PI));
    rotateX(map(mouseY, 0, height, 0, PI));
    box(200);
  }
  