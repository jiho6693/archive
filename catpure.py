import requests
from bs4 import BeautifulSoup

# URL of the website you want to capture
target_url = "https://www.jiho6693.com/"

# Send a GET request to the website
response = requests.get(target_url)

# Check if the request was successful (status code 200)
if response.status_code == 200:
    # Parse the HTML content of the page
    soup = BeautifulSoup(response.text, 'html.parser')

    # Find and extract the content you want
    # (Modify this based on the structure of the target website)
    target_content = soup.find('div', class_='example-class')

    # Save the extracted content to a file or display it on your website
    with open("path/to/captured_content.html", "w", encoding="utf-8") as file:
        file.write(str(target_content))
else:
    print(f"Failed to retrieve content. Status code: {response.status_code}")
