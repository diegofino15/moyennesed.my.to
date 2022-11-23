from flask import *
from flask_cors import CORS
import json, datetime

app = Flask(__name__)
CORS(app)


try:
    with open("./admin.json", "r") as file:
        loaded_file = json.load(file)        
        file.close
    
    password = loaded_file["password"]
    version = loaded_file["version"]
    count_file = loaded_file["count_file"]
except FileNotFoundError:
    password = "0000"
    version = "1.0"
    count_file = "./infos.json"

    print("Admin file has not been found")


@app.route("/", methods=['POST'])
def default():
    data = {
        "version": "1.0",
        "message": "This is the API for https://moyennesed.my.to/"
    }

    return json.dumps(data)

@app.route("/reset_count", methods=['POST'])
def reset_count():
    query_password = str(request.args.get('password'))
    if query_password == password:
        file_data = {
            "version": version,
            "count": 0,
            "connections": {}
        }
        with open(count_file, "w") as file:
            json.dump(file_data, file, indent=4)
            file.close()
        
        successful = True
    else:
        successful = False
    
    data = {
        "version": version,
        "successful": successful
    }

    return json.dumps(data)

@app.route("/get_count", methods=['POST'])
def get_count():
    with open(count_file, "r") as file:
        json_infos = json.load(file)
        file.close()
    
    data = {
        "version": version,
        "count": json_infos["count"]
    }

    return json.dumps(data)

@app.route("/add_count", methods=['POST'])
def add_count():
    query_username = str(request.json.get("username"))

    with open(count_file, "r") as file:
        json_infos = json.load(file)
        file.close()
    
    if (query_username in json_infos["connections"].keys()):
        json_infos["connections"][query_username].append(datetime.datetime.now().ctime())
    else:
        json_infos["connections"].update({query_username: [datetime.datetime.now().ctime()]})
    json_infos["count"] += 1
    
    with open(count_file, "w") as file:
        json.dump(json_infos, file, indent=4)
        file.close()
    
    data = {
        "version": version,
        "count": json_infos["count"]
    }

    return json.dumps(data)

if __name__ == '__main__':
    print("Launching API...")

    ssl_context = ('/etc/letsencrypt/live/moyennesed.my.to/fullchain.pem', '/etc/letsencrypt/live/moyennesed.my.to/privkey.pem')
    app.run(host="0.0.0.0", port=777, ssl_context=ssl_context)

    print("\nAPI stopped")



