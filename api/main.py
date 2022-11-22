from flask import *
from flask_cors import CORS
import json, datetime

app = Flask(__name__)
CORS(app)


password = "1408"
version = "1.0"
count_file = "./count.json"


@app.route("/", methods=['POST'])
def default():
    data = {
        "Version": "1.0",
        "Message": "This is the API for https://moyennesed.my.to/"
    }
    json_data = json.dumps(data)
    return json_data

@app.route("/reset_count", methods=['POST'])
def reset_count():
    query_password = str(request.args.get('password'))
    if query_password == password:
        data = {
            "version": version,
            "count": 0,
            "date": datetime.datetime.now().ctime()
        }
        with open(count_file, "w") as file:
            json.dump(data, file)
            file.close()
        
        data.update({"successful": True})
    else:
        data = {
            "version": version,
            "successful": False
        }

    return json.dumps(data)

@app.route("/get_count", methods=['POST'])
def get_count():
    with open(count_file, "r") as file:
        json_object = json.load(file)
        file.close()
    
    return json.dumps(json_object)

@app.route("/add_count", methods=['POST'])
def add_count():
    with open(count_file, "r") as file:
        json_object = json.load(file)
        file.close()
    
    json_object["count"] += 1

    with open(count_file, "w") as file:
        json.dump(json_object, file)
        file.close()
    
    return json.dumps(json_object)

if __name__ == '__main__':
    print("Launching API...")

    ssl_context = ('/etc/letsencrypt/live/moyennesed.my.to/fullchain.pem', '/etc/letsencrypt/live/moyennesed.my.to/privkey.pem')
    app.run(host="0.0.0.0", port=777, ssl_context=ssl_context)

    print("API stopped")



