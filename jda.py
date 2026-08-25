import random

# 기준값과 비율 설정 (합이 반드시 1.0이어야 함)
value_ratio_map = {
    142440: 0.05,
    142445: 0.9,
    142450: 0.05
}

# 픽셀 개수
total_pixels = 86400

# ±5 범위 랜덤 함수
def get_nearby_value(base):
    return random.randint(base - 5, base + 5)

# 비율에 따라 값 생성
pixel_values = []
for base, ratio in value_ratio_map.items():
    count = int(total_pixels * ratio)
    pixel_values.extend([get_nearby_value(base) for _ in range(count)])

# 개수가 86400이 딱 안 맞을 수 있어서 보정
while len(pixel_values) < total_pixels:
    pixel_values.append(get_nearby_value(random.choice(list(value_ratio_map.keys()))))
pixel_values = pixel_values[:total_pixels]

# 예시 출력
print(pixel_values[:10])
