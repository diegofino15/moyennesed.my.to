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


@app.route("/", methods=['POST', 'GET'])
def default():
    data = {
        "version": version,
        "message": "This is the API for https://moyennesed.my.to/"
    }

    return json.dumps(data)

@app.route("/reset_count", methods=['POST', 'GET'])
def reset_count():
    if (request.args.get('password') != None):
        query_password = str(request.args.get('password'))
    else:
        query_password = str(request.json.get('password'))
    
    if query_password == password:
        file_data = {
            "version": version,
            "count": 0,
            "date_reset": datetime.datetime.now().ctime(),
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

@app.route("/get_count", methods=['POST', 'GET'])
def get_count():
    with open(count_file, "r") as file:
        json_infos = json.load(file)
        file.close()
    
    data = {
        "version": version,
        "count": json_infos["count"]
    }

    return json.dumps(data)

@app.route("/get_full_count", methods=['POST', 'GET'])
def get_full_count():
    if (request.args.get('password') != None):
        query_password = str(request.args.get('password'))
    else:
        query_password = str(request.json.get('password'))
    
    if query_password == password:
        with open(count_file, "r") as file:
            data = json.load(file)
            file.close()
        data.update({"successful": True})
    else:
        data = {
            "message": "Password incorrect",
            "successful": False
        }
    
    return json.dumps(data, indent=4)

@app.route("/add_count", methods=['POST', 'GET'])
def add_count():
    if (request.args.get('username') != None):
        query_username = str(request.args.get('username'))
    else:
        query_username = str(request.json.get('username'))

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

    ssl_context = ('/etc/letsencrypt/live/api.moyennesed.my.to/fullchain.pem', '/etc/letsencrypt/live/api.moyennesed.my.to/privkey.pem')
    app.run(host="0.0.0.0", port=777, ssl_context=ssl_context)

    print("\nAPI stopped")



